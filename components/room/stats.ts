import { PENALTY_DIST } from "./constants";
import type { Member, LivePred, Match } from "./types";

export type PlayerStat = {
  userId: string;
  displayName: string;
  effectivenessScore: number;
  exactRatio: number;
  avgDistance: number;
  homeEffectiveness: number;
  awayEffectiveness: number;
  drawEffectiveness: number;
  avgPointsPerMatch: number;
  coverage: number;
  maxStreak: number;
  worstStreak: number;
  maxExactStreak: number;
  riskFactor: number;
  penaltyAccuracy: number;
  playedPreds: number;
  totalPlayed: number;
};

function calcOutcome(h: number, a: number) {
  return h > a ? "H" : h < a ? "A" : "D";
}

export function computePlayerStats(
  members: Member[],
  allPreds: Map<string, LivePred>,
  matches: Match[]
): PlayerStat[] {
  const played = matches.filter((m) => m.homeGoals !== null && m.awayGoals !== null);

  // Agrupamos partidos por hora de inicio para manejar los "bloques"
  const blocks = new Map<number, Match[]>();
  for (const m of played) {
    const t = new Date(m.kickoffAt).getTime();
    if (!blocks.has(t)) blocks.set(t, []);
    blocks.get(t)!.push(m);
  }
  const sortedTimes = Array.from(blocks.keys()).sort((a, b) => a - b);

  return members.map((mb) => {
    let pts = 0, exactHits = 0, playedPreds = 0;
    let totalDist = 0, totalDiffSq = 0;
    let homeReal = 0, homePts = 0;
    let awayReal = 0, awayPts = 0;
    let drawReal = 0, drawPts = 0;
    let realPenaltyMatches = 0, penaltyCorrect = 0;

    let maxStreak = 0, curStreak = 0;
    let worstStreak = 0, curBadStreak = 0;
    let maxExactStreak = 0, curExactStreak = 0;

    for (const time of sortedTimes) {
      const block = blocks.get(time)!;
      let blockPoints = 0;
      let blockExact = true;
      let hasPredsInBlock = false;

      for (const m of block) {
        const pred = allPreds.get(`${m.id}__${mb.userId}`);
        if (!pred) continue;

        hasPredsInBlock = true;
        playedPreds++;

        const realOutcome = calcOutcome(m.homeGoals!, m.awayGoals!);
        const isExact = pred.h === m.homeGoals && pred.a === m.awayGoals;
        const predOutcome = calcOutcome(pred.h, pred.a);
        const isOutcome = predOutcome === realOutcome;

        if (isExact) {
          blockPoints += 3;
          exactHits++;
          // Estadísticas de condición
          if (realOutcome === "H") homePts += 3;
          else if (realOutcome === "A") awayPts += 3;
          else drawPts += 3;
        } else if (isOutcome) {
          blockPoints += 1;
          blockExact = false;
          if (realOutcome === "H") homePts += 1;
          else if (realOutcome === "A") awayPts += 1;
          else drawPts += 1;
        } else {
          blockExact = false;
        }

        // Estadísticas de condición (reales)
        if (realOutcome === "H") homeReal++;
        else if (realOutcome === "A") awayReal++;
        else if (realOutcome === "D") drawReal++;

        // Distancia y Factor Riesgo
        const dist = Math.abs(pred.h - m.homeGoals!) + Math.abs(pred.a - m.awayGoals!);
        totalDist += dist;
        totalDiffSq += Math.pow((pred.h - m.homeGoals!) + (pred.a - m.awayGoals!), 2);

        // Penales
        if (m.decidedByPenalties) {
          realPenaltyMatches++;
          if (pred.penWinner === m.penWinner) penaltyCorrect++;
        }
      }

      if (hasPredsInBlock) {
        // Racha de puntos (se corta si el bloque no suma nada)
        if (blockPoints > 0) {
          curStreak++;
          maxStreak = Math.max(maxStreak, curStreak);
          curBadStreak = 0;
        } else {
          curBadStreak++;
          worstStreak = Math.max(worstStreak, curBadStreak);
          curStreak = 0;
        }

        // Racha de exactos (debe ser exacto en todos los del bloque)
        if (blockExact && blockPoints > 0) {
          curExactStreak++;
          maxExactStreak = Math.max(maxExactStreak, curExactStreak);
        } else {
          curExactStreak = 0;
        }
      }
    }

    return {
      userId: mb.userId,
      displayName: mb.displayName,
      effectivenessScore: playedPreds > 0 ? Math.round((pts / (playedPreds * 3)) * 1000) / 10 : 0,
      exactRatio: played.length > 0 ? Math.round(((exactHits * 3) / (played.length * 3)) * 1000) / 10 : 0,
      avgDistance: playedPreds > 0 ? Math.round((totalDist / playedPreds) * 10) / 10 : 0,
      homeEffectiveness: homeReal > 0 ? Math.round((homePts / (homeReal * 3)) * 1000) / 10 : 0,
      awayEffectiveness: awayReal > 0 ? Math.round((awayPts / (awayReal * 3)) * 1000) / 10 : 0,
      drawEffectiveness: drawReal > 0 ? Math.round((drawPts / (drawReal * 3)) * 1000) / 10 : 0,
      avgPointsPerMatch: playedPreds > 0 ? Math.round((pts / playedPreds) * 100) / 100 : 0,
      coverage: played.length > 0 ? Math.round((playedPreds / played.length) * 1000) / 10 : 0,
      maxStreak,
      worstStreak,
      maxExactStreak,
      riskFactor: playedPreds > 0 ? Math.round(Math.sqrt(totalDiffSq / playedPreds) * 100) / 100 : 0,
      penaltyAccuracy: realPenaltyMatches > 0 ? Math.round((penaltyCorrect / realPenaltyMatches) * 1000) / 10 : 0,
      playedPreds,
      totalPlayed: played.length,
    };
  });
}