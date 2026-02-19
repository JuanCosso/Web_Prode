// src/lib/standings.ts
import { prisma } from "@/src/lib/prisma";
import { scorePrediction } from "@/src/lib/scoring";
import { MembershipStatus } from "@prisma/client";

export type StandingRow = {
  userId: string;
  displayName: string;
  contributionText: string;
  points: number;
  exactHits: number;
  outcomeHits: number;
  predictedCount: number;
  scoredCount: number;
};

export async function computeStandings(roomId: string): Promise<StandingRow[]> {
  const room = await prisma.room.findUnique({
    where: { id: roomId },
    include: {
      members: {
        // ✅ Solo miembros ACTIVOS — los PENDING no aparecen en ningún lado
        where: { status: MembershipStatus.ACTIVE },
        include: { user: true },
      },
    },
  });
  if (!room) return [];

  const matches = await prisma.match.findMany({
    orderBy: [{ kickoffAt: "asc" }],
    take: 500,
  });

  const preds = await prisma.prediction.findMany({
    where: { roomId },
  });

  const predByUserMatch = new Map<string, typeof preds[number]>();
  for (const p of preds) predByUserMatch.set(`${p.userId}__${p.matchId}`, p);

  const rows: StandingRow[] = room.members.map((m) => ({
    userId: m.userId,
    displayName: m.user.displayName,
    contributionText: m.contributionText ?? "",
    points: 0,
    exactHits: 0,
    outcomeHits: 0,
    predictedCount: 0,
    scoredCount: 0,
  }));

  const rowByUser = new Map(rows.map((r) => [r.userId, r]));

  for (const match of matches) {
    for (const member of room.members) {
      const row = rowByUser.get(member.userId)!;
      const pred = predByUserMatch.get(`${member.userId}__${match.id}`) ?? null;

      if (pred) row.predictedCount += 1;

      const bd = scorePrediction(match, pred);
      row.points += bd.points;
      if (bd.exactHit) row.exactHits += 1;
      if (!bd.exactHit && bd.outcomeHit) row.outcomeHits += 1;

      if (pred && match.homeGoals != null && match.awayGoals != null) row.scoredCount += 1;
    }
  }

  rows.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    if (b.exactHits !== a.exactHits) return b.exactHits - a.exactHits;
    if (b.outcomeHits !== a.outcomeHits) return b.outcomeHits - a.outcomeHits;
    return a.displayName.localeCompare(b.displayName, "es");
  });

  return rows;
}