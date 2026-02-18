import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";
import { RoomRole } from "@prisma/client";

export async function DELETE(
  _req: NextRequest,
  ctx: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await ctx.params;
  const me = await getOrCreateUser();

  const myMember = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { role: true },
  });

  if (!myMember || myMember.role !== RoomRole.OWNER) {
    return NextResponse.json({ error: "NOT_OWNER" }, { status: 403 });
  }

  await prisma.room.delete({ where: { id: roomId } }); // cascades por tu schema

  return NextResponse.json({ ok: true });
}
