import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";
import { MembershipStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = body?.code as string | undefined;

  if (!code) {
    return NextResponse.json({ error: "CODE_REQUIRED" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { code },
    select: {
      id: true,
      accessType: true,
    },
  });

  if (!room) {
    return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
  }

  const me = await getOrCreateUser();

  const existing = await prisma.roomMember.findUnique({
    where: {
      roomId_userId: {
        roomId: room.id,
        userId: me.id,
      },
    },
  });

  if (existing) {
    return NextResponse.json({ error: "ALREADY_MEMBER" }, { status: 400 });
  }

  const status =
    room.accessType === "OPEN"
      ? MembershipStatus.ACTIVE
      : MembershipStatus.PENDING;

  await prisma.roomMember.create({
    data: {
      roomId: room.id,
      userId: me.id,
      status,
    },
  });

  return NextResponse.json({ ok: true, status });
}
