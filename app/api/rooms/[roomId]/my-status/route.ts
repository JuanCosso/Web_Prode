// app/api/rooms/[roomId]/my-status/route.ts
import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const me = await getOrCreateUser();

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { status: true, role: true },
  });

  if (!member) {
    return NextResponse.json({ status: "NOT_MEMBER" }, { status: 404 });
  }

  return NextResponse.json({ status: member.status, role: member.role });
}