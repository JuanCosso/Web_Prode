import type { Member, LivePred, Match } from "./types";
import { PENALTY_DIST } from "./constants";

export type PlayerStat = {
  userId: string;
  displayName: string;
  /** % pts obtenidos / pts máximos posibles (1 decimal) */
  effectivenessScore: number;
  /** % exactos sobre partidos predichos (1 decimal) */
  exactRatio: number;
  /** distancia prom al resultado; no predichos = PENALTY_DIST */
  avgDistance: number;
  /** % efectividad apostando local */
  homeEffectiveness: number;
  /** % efectividad apostando visitante */
  awayEffectiveness: number;
  /** pts promedio por partido predicho */
  avgPointsPerMatch: number;
  /** % partidos predichos sobre total jugados */
  coverage: number;
  /** racha máxima de partidos consecutivos con puntos */
  maxStreak: number;
  /** peor racha: máx partidos seguidos sin sumar */
  worstStreak: number;
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
  const played = matches
    .filter((m) => m.homeGoals !== null && m.awayGoals !== null)
    .sort((a, b) => {
      const gA = a.group ?? "ZZZ";
      const gB = b.group ?? "ZZZ";
      if (gA !== gB) return gA.localeCompare(gB);
      return (a.matchday ?? 0) - (b.matchday ?? 0);
    });

  return members.map((mb) => {
    let pts = 0, maxPts = 0, exactHits = 0, playedPreds = 0;
    let totalDist = 0, homeTotal = 0, homeCorrect = 0, awayTotal = 0, awayCorrect = 0;
    const streakBits: boolean[] = [];

    for (const m of played) {
      const pred = allPreds.get(`${m.id}__${mb.userId}`);
      maxPts += 3;

      if (!pred) {
        streakBits.push(false);
        totalDist += PENALTY_DIST;
        continue;
      }

      playedPreds++;
      const exact = pred.h === m.homeGoals && pred.a === m.awayGoals;
      const outcomeOk =
        !exact && calcOutcome(pred.h, pred.a) === calcOutcome(m.homeGoals!, m.awayGoals!);

      if (exact) { pts += 3; exactHits++; }
      else if (outcomeOk) { pts += 1; }

      streakBits.push(exact || outcomeOk);
      totalDist += Math.abs(pred.h - m.homeGoals!) + Math.abs(pred.a - m.awayGoals!);

      const po = calcOutcome(pred.h, pred.a);
      const ptm = exact ? 3 : outcomeOk ? 1 : 0;
      if (po === "H") { homeTotal++; homeCorrect += ptm; }
      else if (po === "A") { awayTotal++; awayCorrect += ptm; }
    }

    let maxStreak = 0, cur = 0;
    let worstStreak = 0, curBad = 0;
    for (const hit of streakBits) {
      if (hit) { cur++; maxStreak = Math.max(maxStreak, cur); curBad = 0; }
      else { curBad++; worstStreak = Math.max(worstStreak, curBad); cur = 0; }
    }

    const totalPlayed = played.length;

    return {
      userId: mb.userId,
      displayName: mb.displayName,
      effectivenessScore: maxPts > 0 ? Math.round((pts / maxPts) * 1000) / 10 : 0,
      exactRatio: playedPreds > 0 ? Math.round((exactHits / playedPreds) * 1000) / 10 : 0,
      avgDistance: totalPlayed > 0 ? Math.round((totalDist / totalPlayed) * 10) / 10 : 0,
      homeEffectiveness:
        homeTotal > 0 ? Math.round((homeCorrect / (homeTotal * 3)) * 1000) / 10 : 0,
      awayEffectiveness:
        awayTotal > 0 ? Math.round((awayCorrect / (awayTotal * 3)) * 1000) / 10 : 0,
      avgPointsPerMatch:
        playedPreds > 0 ? Math.round((pts / playedPreds) * 100) / 100 : 0,
      coverage: totalPlayed > 0 ? Math.round((playedPreds / totalPlayed) * 1000) / 10 : 0,
      maxStreak,
      worstStreak,
      playedPreds,
      totalPlayed,
    };
  });
}