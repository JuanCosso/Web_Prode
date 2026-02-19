// app/api/rooms/[roomId]/members/[memberId]/kick/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";
import { RoomRole } from "@prisma/client";

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ roomId: string; memberId: string }> }
) {
  const { roomId, memberId } = await params;

  const me = await getOrCreateUser();

  const myMember = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { role: true },
  });

  if (!myMember || (myMember.role !== RoomRole.OWNER && myMember.role !== RoomRole.ADMIN)) {
    return NextResponse.json({ error: "NO_PERMISSION" }, { status: 403 });
  }

  const target = await prisma.roomMember.findUnique({
    where: { id: memberId },
    select: { id: true, role: true, roomId: true },
  });

  if (!target || target.roomId !== roomId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  // No se puede expulsar al OWNER
  if (target.role === RoomRole.OWNER) {
    return NextResponse.json({ error: "CANT_KICK_OWNER" }, { status: 403 });
  }

  // Un ADMIN no puede expulsar a otro ADMIN (solo el OWNER puede)
  if (myMember.role === RoomRole.ADMIN && target.role === RoomRole.ADMIN) {
    return NextResponse.json({ error: "ADMIN_CANT_KICK_ADMIN" }, { status: 403 });
  }

  await prisma.roomMember.delete({ where: { id: target.id } });

  return NextResponse.json({ ok: true });
}