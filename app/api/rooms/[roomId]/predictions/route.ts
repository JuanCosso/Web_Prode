// app/api/rooms/[roomId]/predictions/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth-user";

type PredictionInput = {
  matchId: string;
  predHomeGoals: number;
  predAwayGoals: number;
  predPenWinner?: string | null;
};

type Body = {
  predictions: PredictionInput[];
};

// Stages KO donde aplica lock por fase (en Desafío) en lugar de lock por partido
const KO_STAGES = ["R32", "R16", "QF", "SF", "TPP", "FINAL"] as const;
type KnockoutStage = (typeof KO_STAGES)[number];

function isKnockoutStage(stage: string): stage is KnockoutStage {
  return KO_STAGES.includes(stage as KnockoutStage);
}

// ✅ POST: guarda predicciones respetando locks server-side
export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { id: true },
  });
  if (!member) {
    return NextResponse.json({ error: "NOT_A_MEMBER" }, { status: 403 });
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { editPolicy: true },
  });
  if (!room) {
    return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body?.predictions || !Array.isArray(body.predictions)) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const matchIds = Array.from(new Set(body.predictions.map((p) => p.matchId)));

  // ✅ FIX: quitamos el filtro `stage: "GROUP"` hardcodeado.
  //    Buscamos todos los partidos sin importar stage.
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds } },
    select: { id: true, kickoffAt: true, stage: true },
  });

  const matchById = new Map(matches.map((m) => [m.id, m]));
  const now = new Date();

  // ─── Lógica de lock según editPolicy ─────────────────────────────────────
  //
  // STRICT_PER_MATCH ("Mundial"):
  //   - Cada partido se bloquea individualmente cuando arranca su kickoff.
  //   - Aplica igual para GROUP y KO.
  //
  // ALLOW_UNTIL_ROUND_CLOSE ("Desafío"):
  //   - GROUP: toda la fase de grupos se bloquea cuando arranca el primer partido
  //     del grupo (o de la fase entera, según el modelo actual).
  //   - KO por stage: cada ronda (R32, R16, QF, SF, FINAL) se bloquea cuando
  //     arranca el PRIMER partido de ESE stage.
  //   - Es decir: podés editar R16 hasta que empiece el primer partido de R16,
  //     independientemente de si ya cerraste R32.

  // Pre-calculamos el kickoff más temprano por stage para modo Desafío
  const earliestKickoffByStage = new Map<string, Date>();
  if (room.editPolicy === "ALLOW_UNTIL_ROUND_CLOSE") {
    for (const m of matches) {
      const current = earliestKickoffByStage.get(m.stage);
      if (!current || m.kickoffAt < current) {
        earliestKickoffByStage.set(m.stage, m.kickoffAt);
      }
    }
  }

  const allowed = body.predictions.filter((p) => {
    const m = matchById.get(p.matchId);
    if (!m) return false;

    const hn = p.predHomeGoals;
    const an = p.predAwayGoals;
    if (!Number.isFinite(hn) || !Number.isFinite(an)) return false;
    if (hn < 0 || an < 0 || hn > 20 || an > 20) return false;

    // Validar predPenWinner solo en KO
    if (isKnockoutStage(m.stage)) {
      if (p.predPenWinner !== undefined && p.predPenWinner !== null) {
        if (typeof p.predPenWinner !== "string" || p.predPenWinner.length > 80) {
          return false;
        }
      }
    }

    if (room.editPolicy === "ALLOW_UNTIL_ROUND_CLOSE") {
      // Desafío: se bloquea cuando arranca el primer partido del stage
      const phaseStart = earliestKickoffByStage.get(m.stage);
      const phaseLocked = !!phaseStart && now >= phaseStart;
      return !phaseLocked;
    }

    // Mundial: lock individual por kickoff del partido
    return now < m.kickoffAt;
  });

  if (allowed.length === 0) {
    return NextResponse.json({ ok: true, saved: 0, serverNow: now.toISOString() });
  }

  await prisma.$transaction(
    allowed.map((p) =>
      prisma.prediction.upsert({
        where: {
          roomId_userId_matchId: { roomId, userId: me.id, matchId: p.matchId },
        },
        update: {
          predHomeGoals: p.predHomeGoals,
          predAwayGoals: p.predAwayGoals,
          predPenWinner: p.predPenWinner ?? null,
        },
        create: {
          roomId,
          userId: me.id,
          matchId: p.matchId,
          predHomeGoals: p.predHomeGoals,
          predAwayGoals: p.predAwayGoals,
          predPenWinner: p.predPenWinner ?? null,
        },
      })
    )
  );

  return NextResponse.json({ ok: true, saved: allowed.length, serverNow: now.toISOString() });
}

// ✅ GET: predicciones de todos los miembros para un stage dado
export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { id: true },
  });
  if (!member) {
    return NextResponse.json({ error: "NOT_A_MEMBER" }, { status: 403 });
  }

  const url = new URL(req.url);
  const stage = url.searchParams.get("stage") ?? "GROUP";

  const preds = await prisma.prediction.findMany({
    where: { roomId, match: { stage } },
    select: {
      matchId: true,
      userId: true,
      predHomeGoals: true,
      predAwayGoals: true,
      predPenWinner: true,
      updatedAt: true,
      user: { select: { displayName: true } },
    },
  });

  const now = new Date();

  return NextResponse.json({
    serverNow: now.toISOString(),
    predictions: preds.map((p) => ({
      matchId: p.matchId,
      userId: p.userId,
      displayName: p.user.displayName,
      h: p.predHomeGoals,
      a: p.predAwayGoals,
      penWinner: p.predPenWinner,
      updatedAt: p.updatedAt,
    })),
  });
}