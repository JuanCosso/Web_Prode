// app/room/[roomId]/page.tsx
import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { computeStandings } from "@/src/lib/standings";
import RoomClient from "@/components/room/RoomClient";
import { RoomRole, MembershipStatus } from "@prisma/client";
import { getCurrentUser } from "@/src/lib/auth-user";

function fmt(dt: Date) {
  return new Intl.DateTimeFormat("es-AR", {
    timeZone: "America/Argentina/Buenos_Aires",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(dt);
}

export default async function RoomPage({
  params,
}: {
  params: Promise<{ roomId: string }>;
}) {
  const { roomId } = await params;

  const me = await getCurrentUser();

  if (!me) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-semibold">Sala</h1>
          <p className="mt-2 text-white/70">No se pudo identificar el usuario.</p>
          <div className="mt-6">
            <Link className="rounded-xl border border-white/20 px-4 py-2" href="/">
              Volver
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        include: { user: { select: { id: true, displayName: true } } },
        orderBy: { joinedAt: "asc" },
      },
    },
  });

  if (!room) return <div className="p-6">Room no encontrada</div>;

  const myMember = room.members.find((m) => m.userId === me.id);

  if (!myMember) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-semibold">{room.name}</h1>
          <p className="mt-2 text-white/70">No sos miembro de esta sala. Unite con el código.</p>
          <div className="mt-6 flex gap-2">
            <Link className="rounded-xl border border-white/20 px-4 py-2" href="/join">Ir a Unirse</Link>
            <Link className="rounded-xl border border-white/20 px-4 py-2" href="/">Inicio</Link>
          </div>
        </div>
      </main>
    );
  }

  if (myMember.status === MembershipStatus.PENDING) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-semibold">{room.name}</h1>
          <p className="mt-2 text-yellow-400">Tu solicitud está pendiente de aprobación.</p>
          <div className="mt-6">
            <Link className="rounded-xl border border-white/20 px-4 py-2" href="/">Volver al inicio</Link>
          </div>
        </div>
      </main>
    );
  }

  const myRole = myMember.role;
  const canKick = myRole === RoomRole.OWNER || myRole === RoomRole.ADMIN;
  const isOwner = myRole === RoomRole.OWNER;
  const canModerate = canKick;

  const activeMembers = room.members.filter((m) => m.status === MembershipStatus.ACTIVE);
  const pendingMembers = room.members.filter((m) => m.status === MembershipStatus.PENDING);
  const pendingCount = pendingMembers.length;

  // ✅ Traemos TODOS los partidos de todas las fases, ordenados cronológicamente
  const matches = await prisma.match.findMany({
    orderBy: [
      { kickoffAt: "asc" },
      { group: "asc" },
      { matchday: "asc" },
    ],
    select: {
      id: true,
      stage: true,
      group: true,
      matchday: true,
      kickoffAt: true,
      homeTeam: true,
      awayTeam: true,
      homeGoals: true,
      awayGoals: true,
      decidedByPenalties: true,
      penWinner: true,
    },
  });

  const standings = await computeStandings(roomId);

  const myPreds = await prisma.prediction.findMany({
    where: { roomId, userId: me.id },
    select: {
      matchId: true,
      predHomeGoals: true,
      predAwayGoals: true,
      predPenWinner: true,
    },
  });

  const playedCount = matches.filter((m) => new Date() >= m.kickoffAt).length;

  return (
    <RoomClient
      room={{
        id: room.id,
        name: room.name,
        code: room.code,
        editPolicy: room.editPolicy,
        accessType: room.accessType,
      }}
      me={{ id: me.id, displayName: me.displayName ?? "Invitado" }}
      members={activeMembers.map((m) => ({
        id: m.id,
        userId: m.userId,
        displayName: m.user.displayName ?? "Invitado",
        role: m.role,
        contributionText: m.contributionText ?? "",
      }))}
      pendingMembers={pendingMembers.map((m) => ({
        id: m.id,
        displayName: m.user.displayName ?? "Invitado",
      }))}
      pendingCount={pendingCount}
      canKick={canKick}
      canModerate={canModerate}
      isOwner={isOwner}
      matches={matches.map((m) => ({
        ...m,
        kickoffLabel: fmt(m.kickoffAt),
      }))}
      myPreds={myPreds}
      standings={standings}
      playedCount={playedCount}
    />
  );
}