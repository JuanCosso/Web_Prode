import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth-user";

type Body = {
  predictions: Array<{
    matchId: string;
    predHomeGoals: number;
    predAwayGoals: number;
  }>;
};

// ✅ POST: guarda MIS predicciones (masivo) respetando locks server-side
export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  // 🔥 Usuario unificado (Google o Invitado cookie)
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { id: true },
  });

  if (!member) {
    return NextResponse.json(
      { error: "NOT_A_MEMBER" },
      { status: 403 }
    );
  }

  const room = await prisma.room.findUnique({
    where: { id: roomId },
    select: { editPolicy: true },
  });

  if (!room) {
    return NextResponse.json(
      { error: "ROOM_NOT_FOUND" },
      { status: 404 }
    );
  }

  const body = (await req.json().catch(() => null)) as Body | null;

  if (!body?.predictions || !Array.isArray(body.predictions)) {
    return NextResponse.json(
      { error: "INVALID_BODY" },
      { status: 400 }
    );
  }

  const matchIds = Array.from(
    new Set(body.predictions.map((p) => p.matchId))
  );

  // 🔥 Siempre filtramos por GROUP
  const matches = await prisma.match.findMany({
    where: { id: { in: matchIds }, stage: "GROUP" },
    select: { id: true, kickoffAt: true },
  });

  const matchById = new Map(matches.map((m) => [m.id, m]));

  const now = new Date();

  // 🔒 Desafío: se bloquea toda la fase cuando arranca
  let phaseLocked = false;

  if (room.editPolicy === "ALLOW_UNTIL_ROUND_CLOSE") {
    const phaseStart = matches.reduce<Date | null>((acc, m) => {
      if (!acc) return m.kickoffAt;
      return m.kickoffAt < acc ? m.kickoffAt : acc;
    }, null);

    phaseLocked = !!phaseStart && now >= phaseStart;
  }

  const allowed = body.predictions.filter((p) => {
    const m = matchById.get(p.matchId);
    if (!m) return false;

    const hn = p.predHomeGoals;
    const an = p.predAwayGoals;

    if (!Number.isFinite(hn) || !Number.isFinite(an)) return false;
    if (hn < 0 || an < 0 || hn > 20 || an > 20) return false;

    if (room.editPolicy === "ALLOW_UNTIL_ROUND_CLOSE") {
      return !phaseLocked;
    }

    // Mundial: lock por partido al kickoff
    return now < m.kickoffAt;
  });

  if (allowed.length === 0) {
    return NextResponse.json({
      ok: true,
      saved: 0,
      serverNow: now.toISOString(),
    });
  }

  await prisma.$transaction(
    allowed.map((p) =>
      prisma.prediction.upsert({
        where: {
          roomId_userId_matchId: {
            roomId,
            userId: me.id,
            matchId: p.matchId,
          },
        },
        update: {
          predHomeGoals: p.predHomeGoals,
          predAwayGoals: p.predAwayGoals,
        },
        create: {
          roomId,
          userId: me.id,
          matchId: p.matchId,
          predHomeGoals: p.predHomeGoals,
          predAwayGoals: p.predAwayGoals,
        },
      })
    )
  );

  return NextResponse.json({
    ok: true,
    saved: allowed.length,
    serverNow: now.toISOString(),
  });
}

// ✅ GET: polling para ver predicciones de TODOS (en vivo)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  // 🔥 Usuario unificado
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json(
      { error: "UNAUTHENTICATED" },
      { status: 401 }
    );
  }

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { id: true },
  });

  if (!member) {
    return NextResponse.json(
      { error: "NOT_A_MEMBER" },
      { status: 403 }
    );
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
      updatedAt: p.updatedAt,
    })),
  });
}
