// app/api/rooms/[roomId]/members/[memberId]/approve/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";
import { RoomRole, MembershipStatus } from "@prisma/client";

export async function PATCH(
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
    select: { id: true, status: true, roomId: true },
  });

  if (!target || target.roomId !== roomId) {
    return NextResponse.json({ error: "NOT_FOUND" }, { status: 404 });
  }

  if (target.status !== MembershipStatus.PENDING) {
    return NextResponse.json({ error: "NOT_PENDING" }, { status: 400 });
  }

  const updated = await prisma.roomMember.update({
    where: { id: target.id },
    data: { status: MembershipStatus.ACTIVE },
    include: {
      user: { select: { displayName: true } },
    },
  });

  return NextResponse.json({
    ok: true,
    member: {
      id: updated.id,
      userId: updated.userId,
      displayName: updated.user.displayName ?? "Invitado",
      role: updated.role,
      contributionText: updated.contributionText, // ✅ el real, no ""
    },
  });
}