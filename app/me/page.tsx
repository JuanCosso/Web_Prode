// app/me/page.tsx
import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth-user";
import { scorePrediction } from "@/src/lib/scoring";
import { MembershipStatus } from "@prisma/client";

// ── Para cada sala: calcula posición y puntos del usuario actual ──────────────
async function getRoomSummaries(userId: string) {
  // Traemos todas las salas donde el usuario es ACTIVO
  const memberships = await prisma.roomMember.findMany({
    where: { userId, status: MembershipStatus.ACTIVE },
    include: {
      room: {
        include: {
          members: {
            where: { status: MembershipStatus.ACTIVE },
            select: { userId: true },
          },
        },
      },
    },
    orderBy: { joinedAt: "desc" },
  });

  if (memberships.length === 0) return [];

  const roomIds = memberships.map((m) => m.roomId);

  // Todos los partidos jugados (con resultado)
  const matches = await prisma.match.findMany({
    where: { homeGoals: { not: null }, awayGoals: { not: null } },
    select: {
      id: true, stage: true,
      homeGoals: true, awayGoals: true,
      decidedByPenalties: true, penWinner: true,
    },
  });

  if (matches.length === 0) {
    // Torneo no arrancó: devolvemos salas sin puntos
    return memberships.map((m) => ({
      roomId: m.roomId,
      roomName: m.room.name,
      roomCode: m.room.code,
      editPolicy: m.room.editPolicy,
      memberCount: m.room.members.length,
      myPoints: null as number | null,
      myPosition: null as number | null,
      totalMembers: m.room.members.length,
      started: false,
    }));
  }

  const matchIds = matches.map((m) => m.id);

  // Todas las predicciones de estas salas para los partidos jugados
  const allPreds = await prisma.prediction.findMany({
    where: { roomId: { in: roomIds }, matchId: { in: matchIds } },
    select: { roomId: true, userId: true, matchId: true,
      predHomeGoals: true, predAwayGoals: true, predPenWinner: true },
  });

  // Indexar predicciones por roomId+userId+matchId
  const predIndex = new Map<string, typeof allPreds[number]>();
  for (const p of allPreds) {
    predIndex.set(`${p.roomId}__${p.userId}__${p.matchId}`, p);
  }

  // Calcular puntos por usuario por sala
  return memberships.map((m) => {
    const allUserIds = m.room.members.map((mb) => mb.userId);

    // Puntos de cada miembro en esta sala
    const pointsByUser = new Map<string, number>();
    for (const uid of allUserIds) {
      let pts = 0;
      for (const match of matches) {
        const pred = predIndex.get(`${m.roomId}__${uid}__${match.id}`) ?? null;
        // scorePrediction espera un Match completo — construimos uno mínimo
        const fakeMatch = {
          homeGoals: match.homeGoals,
          awayGoals: match.awayGoals,
          stage: match.stage,
          decidedByPenalties: match.decidedByPenalties,
          penWinner: match.penWinner,
        } as any;
        const fakePred = pred ? {
          predHomeGoals: pred.predHomeGoals,
          predAwayGoals: pred.predAwayGoals,
          predPenWinner: pred.predPenWinner,
        } as any : null;
        pts += scorePrediction(fakeMatch, fakePred).points;
      }
      pointsByUser.set(uid, pts);
    }

    const myPoints = pointsByUser.get(userId) ?? 0;

    // Posición: cuántos tienen MÁS puntos que yo + 1
    const myPosition = Array.from(pointsByUser.values())
      .filter((p) => p > myPoints).length + 1;

    return {
      roomId: m.roomId,
      roomName: m.room.name,
      roomCode: m.room.code,
      editPolicy: m.room.editPolicy,
      memberCount: m.room.members.length,
      myPoints,
      myPosition,
      totalMembers: m.room.members.length,
      started: true,
    };
  });
}

function positionLabel(pos: number, total: number) {
  if (pos === 1) return { text: "1°", color: "text-yellow-400" };
  if (pos === 2) return { text: "2°", color: "text-slate-300" };
  if (pos === 3) return { text: "3°", color: "text-amber-600" };
  if (pos > total * 0.75) return { text: `${pos}°`, color: "text-red-400/80" };
  return { text: `${pos}°`, color: "text-white/60" };
}

export default async function MePage() {
  const me = await getCurrentUser();

  if (!me) {
    return (
      <main className="relative min-h-screen overflow-hidden text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-cover bg-center scale-105"
            style={{ backgroundImage: "url('/img/LogoProde.webp')" }} />
          <div className="absolute inset-0 bg-slate-950/75" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition">← Inicio</Link>
          <p className="mt-4 text-white/60">No se pudo identificar el usuario.</p>
        </div>
      </main>
    );
  }

  const rooms = await getRoomSummaries(me.id);

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: "url('/img/LogoProde.webp')" }} />
        <div className="absolute inset-0 bg-slate-950/75" />
      </div>

      <section className="relative z-10">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">

          <div className="mb-1">
            <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition">← Inicio</Link>
          </div>

          <div className="flex items-center justify-between mt-1 mb-6">
            <div>
              <h1 className="text-2xl font-bold">Mis partidas</h1>
              <p className="mt-1 text-sm text-white/50">
                {me.displayName} · {rooms.length} {rooms.length === 1 ? "sala" : "salas"}
              </p>
            </div>
          </div>

          {rooms.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-10 text-center backdrop-blur">
              <p className="text-white/40 text-sm mb-5">Todavía no estás en ninguna sala.</p>
              <div className="flex justify-center gap-3">
                <Link href="/create"
                  className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5">
                  Crear sala
                </Link>
                <Link href="/join"
                  className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/15">
                  Unirse con código
                </Link>
              </div>
            </div>
          ) : (
            <div className="flex flex-col gap-3">
              {rooms.map((r) => {
                const pos = r.started && r.myPosition != null
                  ? positionLabel(r.myPosition, r.totalMembers)
                  : null;

                return (
                  <Link key={r.roomId} href={`/room/${r.roomId}`}
                    className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur transition hover:bg-white/8 hover:border-white/18">

                    {/* Info sala */}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="truncate text-sm font-semibold">{r.roomName}</span>
                        <span className="shrink-0 rounded-md border border-white/15 px-1.5 py-px font-mono text-[10px] text-white/40">
                          {r.roomCode}
                        </span>
                      </div>
                      <div className="mt-1 flex items-center gap-3 text-xs text-white/40">
                        <span>{r.memberCount} {r.memberCount === 1 ? "jugador" : "jugadores"}</span>
                        <span>·</span>
                        <span>{r.editPolicy === "STRICT_PER_MATCH" ? "Mundial" : "Desafío"}</span>
                      </div>
                    </div>

                    {/* Stats: posición y puntos */}
                    <div className="ml-4 flex items-center gap-4 shrink-0">
                      {r.started && pos ? (
                        <>
                          <div className="text-right">
                            <div className={`text-xl font-bold leading-none ${pos.color}`}>
                              {pos.text}
                            </div>
                            <div className="mt-0.5 text-[10px] text-white/35">posición</div>
                          </div>
                          <div className="h-8 w-px bg-white/10" />
                          <div className="text-right">
                            <div className="text-xl font-bold leading-none text-white">
                              {r.myPoints}
                            </div>
                            <div className="mt-0.5 text-[10px] text-white/35">puntos</div>
                          </div>
                        </>
                      ) : (
                        <div className="text-xs text-white/30 italic">Sin partidos aún</div>
                      )}
                      <span className="text-white/25 group-hover:text-white/50 transition text-sm ml-1">→</span>
                    </div>

                  </Link>
                );
              })}
            </div>
          )}

        </div>
      </section>
    </main>
  );
}