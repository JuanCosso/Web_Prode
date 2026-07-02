import { prisma } from "@/src/lib/prisma";

type Match = {
  id?: string;
  fifaId?: string | null;
  stage: string;
  homeTeam?: string;
  awayTeam?: string;
  homeGoals: number | null;
  awayGoals: number | null;
  decidedByPenalties?: boolean;
  penWinner?: string | null;
  kickoffAt: Date | string;
};

function isPlaceholder(value: string | null | undefined): boolean {
  if (!value) return true;
  return /^((Ganador|Perdedor)\s|3° mejor|1° Grupo|2° Grupo)/.test(value.trim());
}

const BRACKET_MAP: Record<string, Array<{ fifaId: string; side: "home" | "away" }>> = {
  "R32-01": [{ fifaId: "R16-01", side: "home" }],
  "R32-02": [{ fifaId: "R16-01", side: "away" }],
  "R32-03": [{ fifaId: "R16-02", side: "home" }],
  "R32-04": [{ fifaId: "R16-02", side: "away" }],
  "R32-05": [{ fifaId: "R16-03", side: "home" }],
  "R32-06": [{ fifaId: "R16-03", side: "away" }],
  "R32-07": [{ fifaId: "R16-04", side: "home" }],
  "R32-08": [{ fifaId: "R16-04", side: "away" }],
  "R32-09": [{ fifaId: "R16-05", side: "home" }],
  "R32-10": [{ fifaId: "R16-05", side: "away" }],
  "R32-11": [{ fifaId: "R16-06", side: "home" }],
  "R32-12": [{ fifaId: "R16-06", side: "away" }],
  "R32-13": [{ fifaId: "R16-07", side: "home" }],
  "R32-14": [{ fifaId: "R16-07", side: "away" }],
  "R32-15": [{ fifaId: "R16-08", side: "home" }],
  "R32-16": [{ fifaId: "R16-08", side: "away" }],
  "R16-01": [{ fifaId: "QF-01", side: "home" }],
  "R16-02": [{ fifaId: "QF-01", side: "away" }],
  "R16-03": [{ fifaId: "QF-02", side: "home" }],
  "R16-04": [{ fifaId: "QF-02", side: "away" }],
  "R16-05": [{ fifaId: "QF-03", side: "home" }],
  "R16-06": [{ fifaId: "QF-03", side: "away" }],
  "R16-07": [{ fifaId: "QF-04", side: "home" }],
  "R16-08": [{ fifaId: "QF-04", side: "away" }],
  "QF-01": [{ fifaId: "SF-01", side: "home" }],
  "QF-02": [{ fifaId: "SF-01", side: "away" }],
  "QF-03": [{ fifaId: "SF-02", side: "home" }],
  "QF-04": [{ fifaId: "SF-02", side: "away" }],
  "SF-01": [{ fifaId: "FINAL-01", side: "home" }, { fifaId: "TPP-01", side: "home" }],
  "SF-02": [{ fifaId: "FINAL-01", side: "away" }, { fifaId: "TPP-01", side: "away" }],
};

const LOSER_MAP: Record<string, Array<{ fifaId: string; side: "home" | "away" }>> = {
  "SF-01": [{ fifaId: "TPP-01", side: "home" }],
  "SF-02": [{ fifaId: "TPP-01", side: "away" }],
};

export async function syncMatchProgression(match: Match) {
  if (!match.fifaId) return;

  const winner = (() => {
    if (match.homeGoals === null || match.awayGoals === null) return null;
    if (match.decidedByPenalties && match.penWinner) return match.penWinner;
    if (match.homeGoals > match.awayGoals) return match.homeTeam;
    if (match.awayGoals > match.homeGoals) return match.awayTeam;
    return null;
  })();

  const loser = winner ? (winner === match.homeTeam ? match.awayTeam : match.homeTeam) : null;

  // Actualizar próximos partidos del ganador
  if (winner) {
    for (const mapping of BRACKET_MAP[match.fifaId] ?? []) {
      const nextMatch = await prisma.match.findUnique({
        where: { fifaId: mapping.fifaId },
        select: { id: true, fifaId: true, homeTeam: true, awayTeam: true },
      });
      if (!nextMatch) continue;

      const currentValue = mapping.side === "home" ? nextMatch.homeTeam : nextMatch.awayTeam;
      if (!isPlaceholder(currentValue)) continue;

      await prisma.match.update({
        where: { id: nextMatch.id },
        data: mapping.side === "home" ? { homeTeam: winner } : { awayTeam: winner },
      });
    }
  }

  // Actualizar partidos del perdedor (3° puesto)
  if (loser) {
    for (const mapping of LOSER_MAP[match.fifaId] ?? []) {
      const nextMatch = await prisma.match.findUnique({
        where: { fifaId: mapping.fifaId },
        select: { id: true, fifaId: true, homeTeam: true, awayTeam: true },
      });
      if (!nextMatch) continue;

      const currentValue = mapping.side === "home" ? nextMatch.homeTeam : nextMatch.awayTeam;
      if (!isPlaceholder(currentValue)) continue;

      await prisma.match.update({
        where: { id: nextMatch.id },
        data: mapping.side === "home" ? { homeTeam: loser } : { awayTeam: loser },
      });
    }
  }
}

export function getNextActiveStage(matches: Match[]): string | null {
  const KO_STAGES = ["R32", "R16", "QF", "SF", "TPP", "FINAL"];
  const now = new Date();

  for (const stage of KO_STAGES) {
    const stageMatches = matches.filter((m) => m.stage === stage);
    if (stageMatches.length === 0) continue;

    const hasUnplayedMatch = stageMatches.some(
      (m) => m.homeGoals === null || m.awayGoals === null || new Date(m.kickoffAt) > now
    );

    if (hasUnplayedMatch) {
      return stage;
    }
  }

  return null;
}
