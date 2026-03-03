import type { DefaultSession, NextAuthOptions } from "next-auth";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/src/lib/prisma";
import { cookies } from "next/headers";
import type { Prisma } from "@prisma/client";

async function mergeGuestIntoUser(guestId: string, userId: string) {
  if (guestId === userId) return;

  await prisma.$transaction(async (tx) => {
    const guestExists = await tx.user.findUnique({
      where: { id: guestId },
      select: { id: true },
    });
    if (!guestExists) return;

    // Mover membresías (evitar choque por @@unique([roomId, userId]))
    const guestMemberships = await tx.roomMember.findMany({
      where: { userId: guestId },
      select: {
        roomId: true,
        contributionText: true,
        joinedAt: true,
        role: true,
      },
    });

    for (const m of guestMemberships) {
      const existing = await tx.roomMember.findUnique({
        where: { roomId_userId: { roomId: m.roomId, userId } },
        select: { id: true, contributionText: true, role: true },
      });

      if (!existing) {
        await tx.roomMember.create({
          data: {
            roomId: m.roomId,
            userId,
            contributionText: m.contributionText,
            joinedAt: m.joinedAt,
            role: m.role,
          },
        });
      } else {
        // Merge suave: no pisar texto, pero completar si está vacío; y subir rol si corresponde
        const shouldCopyContribution =
          (!existing.contributionText || existing.contributionText.trim() === "") &&
          !!m.contributionText &&
          m.contributionText.trim() !== "";

        const roleRank = (r: string) => (r === "OWNER" ? 3 : r === "ADMIN" ? 2 : 1);
        const shouldPromoteRole = roleRank(m.role) > roleRank(existing.role);

        if (shouldCopyContribution || shouldPromoteRole) {
          await tx.roomMember.update({
            where: { id: existing.id },
            data: {
              ...(shouldCopyContribution ? { contributionText: m.contributionText } : {}),
              ...(shouldPromoteRole ? { role: m.role } : {}),
            },
          });
        }
      }
    }

    // Mover predicciones (evitar choque por @@unique([roomId, userId, matchId]))
    const guestPredictions = await tx.prediction.findMany({
      where: { userId: guestId },
      select: {
        roomId: true,
        matchId: true,
        predHomeGoals: true,
        predAwayGoals: true,
        predPenWinner: true,
      },
    });

    for (const p of guestPredictions) {
      try {
        await tx.prediction.create({
          data: {
            roomId: p.roomId,
            userId,
            matchId: p.matchId,
            predHomeGoals: p.predHomeGoals,
            predAwayGoals: p.predAwayGoals,
            predPenWinner: p.predPenWinner,
          },
        });
      } catch (e) {
        const err = e as Prisma.PrismaClientKnownRequestError;
        if (err.code !== "P2002") throw e; // unique violation => ya existía para el user destino
      }
    }

    // Mantener audit logs si luego borramos el user invitado
    await tx.auditLog.updateMany({
      where: { actorUserId: guestId },
      data: { actorUserId: userId },
    });

    // Limpiar filas que quedaron en el invitado (ya se movieron o chocaron por unique)
    await tx.roomMember.deleteMany({ where: { userId: guestId } });
    await tx.prediction.deleteMany({ where: { userId: guestId } });

    // Finalmente borrar el user invitado
    await tx.user.delete({ where: { id: guestId } });
  });
}

export const authOptions: NextAuthOptions = {
  adapter: {
    ...PrismaAdapter(prisma),
    createUser: async (data: any) => {
      const { email, name, image, emailVerified, id } = data;
      const base = name ?? email?.split("@")[0] ?? "Usuario";
      let displayName = base.slice(0, 20);
      const exists = await prisma.user.findFirst({
        where: { displayName },
        select: { id: true },
      });
      if (exists) {
        displayName = `${displayName.slice(0, 15)}_${Math.random().toString(36).slice(2, 6)}`;
      }
      const user = await prisma.user.create({
        data: { id, email, name, image, emailVerified, displayName },
      });
      return user as any;  // ← esto resuelve el error de tipos
    },
  },
  session: { strategy: "database" },
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      authorization: {
        params: {
          prompt: "select_account",
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      const store = await cookies();
      const guestId = store.get("prode_uid")?.value;
    
      if (!guestId) return true;
      if (!user.email) return true;
    
      const googleUser = await prisma.user.findUnique({
        where: { email: user.email },
      });
    
      if (!googleUser) return true;
      if (guestId === googleUser.id) return true;
    
      // 🔎 Verificar si Google ya tenía datos
      const googleHasMemberships = await prisma.roomMember.findFirst({
        where: { userId: googleUser.id },
      });
    
      const googleHasPredictions = await prisma.prediction.findFirst({
        where: { userId: googleUser.id },
      });
    
      const googleAlreadyHadData = !!googleHasMemberships || !!googleHasPredictions;
    
      if (!googleAlreadyHadData) {
        // 🟢 Caso A → merge
        await mergeGuestIntoUser(guestId, googleUser.id);
      } else {
        // 🔴 Caso B → descartar guest
        await prisma.roomMember.deleteMany({ where: { userId: guestId } });
        await prisma.prediction.deleteMany({ where: { userId: guestId } });
        await prisma.user.delete({ where: { id: guestId } });
      }
    
      // 🧹 Limpiar cookie SIEMPRE
      store.delete("prode_uid");
    
      return true;
    }
    ,
    async session({ session, user }) {
      if (session.user) (session.user as DefaultSession["user"] & { id: string }).id = user.id;
      return session;
    },
  },
};

export default NextAuth(authOptions);
