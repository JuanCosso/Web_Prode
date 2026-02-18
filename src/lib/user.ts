import { cookies } from "next/headers";
import { prisma } from "@/src/lib/prisma";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/auth";

const COOKIE_NAME = "prode_uid";

export async function getOrCreateUser() {
  // 1) Si hay sesión Google, usar ese user persistente
  const session = await getServerSession(authOptions);
  const sessionUserId = (session?.user as any)?.id as string | undefined;

  if (sessionUserId) {
    // El adapter crea el usuario; acá solo sincronizamos algunos campos opcionales
    const email = session?.user?.email ?? null;
    const name = session?.user?.name ?? null;
    const image = (session?.user as any)?.image ?? null;

    const u = await prisma.user.upsert({
      where: { id: sessionUserId },
      update: {
        email: email ?? undefined,
        name: name ?? undefined,
        image: image ?? undefined,
      },
      create: {
        id: sessionUserId,
        email: email ?? undefined,
        name: name ?? undefined,
        image: image ?? undefined,
        displayName: `Usuario_${sessionUserId.slice(0, 6)}`,
      },
    });

    return u;
  }

  // 2) Si no hay sesión: invitado por cookie (como antes)
  const store = await cookies();
  let uid = store.get(COOKIE_NAME)?.value;

  if (!uid) {
    return null;
  }

  const user = await prisma.user.findUnique({
    where: { id: uid },
  });

  return user;
}
