import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth-user";

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

type Body = {
  roomId?: string;
  fromDisplayName?: string;
  toDisplayName?: string;
  overwriteExisting?: boolean;
};

export async function POST(req: Request) {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!isAdmin(me.email)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = (await req.json().catch(() => null)) as Body | null;
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const roomId = body.roomId?.trim();
  const fromDisplayName = body.fromDisplayName?.trim();
  const toDisplayName = body.toDisplayName?.trim();
  const overwriteExisting = Boolean(body.overwriteExisting);

  if (!roomId || !fromDisplayName || !toDisplayName) {
    return NextResponse.json(
      { error: "ROOM_AND_USERNAMES_REQUIRED" },
      { status: 400 }
    );
  }

  if (fromDisplayName === toDisplayName) {
    return NextResponse.json(
      { error: "SOURCE_AND_TARGET_MUST_BE_DIFFERENT" },
      { status: 400 }
    );
  }

  const [fromUser, toUser] = await Promise.all([
    prisma.user.findUnique({ where: { displayName: fromDisplayName } }),
    prisma.user.findUnique({ where: { displayName: toDisplayName } }),
  ]);

  if (!fromUser || !toUser) {
    return NextResponse.json(
      { error: "USER_NOT_FOUND", fromFound: !!fromUser, toFound: !!toUser },
      { status: 404 }
    );
  }

  const room = await prisma.room.findUnique({ where: { id: roomId }, select: { id: true } });
  if (!room) {
    return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
  }

  const targetMember = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: toUser.id } },
    select: { status: true },
  });
  if (!targetMember || targetMember.status !== "ACTIVE") {
    return NextResponse.json(
      { error: "TARGET_USER_NOT_ACTIVE_IN_ROOM" },
      { status: 400 }
    );
  }

  const sourcePredictions = await prisma.prediction.findMany({
    where: { roomId, userId: fromUser.id },
    select: {
      id: true,
      matchId: true,
      predHomeGoals: true,
      predAwayGoals: true,
      predPenWinner: true,
    },
  });

  if (sourcePredictions.length === 0) {
    return NextResponse.json({ ok: true, moved: 0, skipped: 0, overwritten: 0 });
  }

  const targetPredictions = await prisma.prediction.findMany({
    where: { roomId, userId: toUser.id },
    select: { id: true, matchId: true },
  });
  const targetByMatch = new Map(targetPredictions.map((p) => [p.matchId, p]));

  const ops: Array<ReturnType<typeof prisma.prediction.update> | ReturnType<typeof prisma.prediction.delete>> = [];
  let moved = 0;
  let skipped = 0;
  let overwritten = 0;

  for (const source of sourcePredictions) {
    const existing = targetByMatch.get(source.matchId);
    if (existing) {
      if (overwriteExisting) {
        ops.push(
          prisma.prediction.update({
            where: { id: existing.id },
            data: {
              predHomeGoals: source.predHomeGoals,
              predAwayGoals: source.predAwayGoals,
              predPenWinner: source.predPenWinner ?? null,
            },
          })
        );
        overwritten += 1;
        moved += 1;
      } else {
        skipped += 1;
      }
      ops.push(prisma.prediction.delete({ where: { id: source.id } }));
    } else {
      ops.push(
        prisma.prediction.update({
          where: { id: source.id },
          data: { userId: toUser.id },
        })
      );
      moved += 1;
    }
  }

  await prisma.$transaction(ops);

  return NextResponse.json({ ok: true, moved, skipped, overwritten });
}
