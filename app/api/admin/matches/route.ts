// app/api/admin/matches/route.ts
// GET: lista todos los partidos para la UI de admin

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth-user";

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export async function GET() {
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!isAdmin(me.email)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const matches = await prisma.match.findMany({
    orderBy: [{ kickoffAt: "asc" }],
    select: {
      id: true,
      fifaId: true,
      stage: true,
      group: true,
      matchday: true,
      homeTeam: true,
      awayTeam: true,
      homeGoals: true,
      awayGoals: true,
      decidedByPenalties: true,
      penWinner: true,
      kickoffAt: true,
      city: true,
    },
  });

  return NextResponse.json({ matches });
}