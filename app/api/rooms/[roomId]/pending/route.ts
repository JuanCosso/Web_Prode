// app/api/rooms/[roomId]/pending/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";
import { RoomRole, MembershipStatus } from "@prisma/client";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const me = await getOrCreateUser();

  const myMember = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { role: true },
  });

  if (!myMember || (myMember.role !== RoomRole.OWNER && myMember.role !== RoomRole.ADMIN)) {
    return NextResponse.json({ error: "NO_PERMISSION" }, { status: 403 });
  }

  const pending = await prisma.roomMember.findMany({
    where: { roomId, status: MembershipStatus.PENDING },
    select: { id: true, user: { select: { displayName: true } } },
    orderBy: { joinedAt: "asc" },
  });

  return NextResponse.json({
    pending: pending.map((m) => ({
      id: m.id,
      displayName: m.user.displayName ?? "Invitado",
    })),
  });
}