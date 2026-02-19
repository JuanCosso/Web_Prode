// app/api/rooms/join/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";
import { MembershipStatus } from "@prisma/client";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const code = body?.code as string | undefined;
  // ✅ Leer contributionText del body
  const contributionText = typeof body?.contributionText === "string"
    ? body.contributionText.trim()
    : "";

  if (!code) {
    return NextResponse.json({ error: "CODE_REQUIRED" }, { status: 400 });
  }

  const room = await prisma.room.findUnique({
    where: { code },
    select: { id: true, accessType: true },
  });

  if (!room) {
    return NextResponse.json({ error: "ROOM_NOT_FOUND" }, { status: 404 });
  }

  const me = await getOrCreateUser();

  const existing = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId: room.id, userId: me.id } },
    select: { status: true },
  });

  if (existing) {
    if (existing.status === MembershipStatus.REJECTED) {
      return NextResponse.json({ error: "REQUEST_REJECTED" }, { status: 403 });
    }
    return NextResponse.json({ ok: true, roomId: room.id, status: existing.status });
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
      contributionText, // ✅ guardado
    },
  });

  return NextResponse.json({ ok: true, roomId: room.id, status });
}