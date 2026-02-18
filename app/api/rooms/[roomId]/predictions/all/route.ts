import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/src/lib/user";
import { prisma } from "@/src/lib/prisma";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;
  const user = await getOrCreateUser();

  const member = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: user.id } },
  });
  if (!member) return NextResponse.json({ error: "No sos miembro" }, { status: 403 });

  // Todos los pronósticos visibles
  const predictions = await prisma.prediction.findMany({
    where: { roomId },
    include: {
      user: { select: { id: true, displayName: true } },
      match: { select: { id: true, stage: true, group: true, matchday: true, homeTeam: true, awayTeam: true, kickoffAt: true } },
    },
    orderBy: [{ match: { kickoffAt: "asc" } }],
  });

  return NextResponse.json({ predictions });
}
