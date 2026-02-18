import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";
import { RoomRole } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ roomId: string; memberId: string }> }
) {
  const { roomId, memberId } = await ctx.params;
  const body = await req.json().catch(() => ({}));
  const role = body?.role as RoomRole | undefined;

  if (role !== RoomRole.ADMIN && role !== RoomRole.MEMBER) {
    return NextResponse.json({ error: "INVALID_ROLE" }, { status: 400 });
  }

  const me = await getOrCreateUser();

  const myMember = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { role: true },
  });

  if (!myMember || myMember.role !== RoomRole.OWNER) {
    return NextResponse.json({ error: "NOT_OWNER" }, { status: 403 });
  }

  const target = await prisma.roomMember.findUnique({
    where: { id: memberId },
    select: { id: true, roomId: true, role: true },
  });

  if (!target || target.roomId !== roomId) {
    return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });
  }
  if (target.role === RoomRole.OWNER) {
    return NextResponse.json({ error: "CANT_CHANGE_OWNER" }, { status: 403 });
  }

  await prisma.roomMember.update({ where: { id: target.id }, data: { role } });
  return NextResponse.json({ ok: true });
}
