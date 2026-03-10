import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth-user";
import { RoomRole } from "@prisma/client";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { id: true, role: true },
  });

  if (!member) {
    return NextResponse.json({ error: "NOT_A_MEMBER" }, { status: 404 });
  }

  if (member.role === RoomRole.OWNER) {
    return NextResponse.json({ error: "OWNER_CANNOT_LEAVE" }, { status: 403 });
  }

  await prisma.roomMember.delete({ where: { id: member.id } });

  return NextResponse.json({ ok: true });
}