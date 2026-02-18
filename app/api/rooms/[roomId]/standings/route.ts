import { NextResponse } from "next/server";
import { getOrCreateUser } from "@/src/lib/user";
import { prisma } from "@/src/lib/prisma";
import { computeStandings } from "@/src/lib/standings";

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

  const standings = await computeStandings(roomId);
  return NextResponse.json({ standings });
}
