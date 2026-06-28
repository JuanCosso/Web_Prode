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

export type StatMetric = {
  key: keyof PlayerStat;
  label: string;
  sublabel: string;
  icon: string;
  color: string;
  format: (v: number) => string;
  best: "max" | "min";
};

export const PLAYER_STAT_ROWS: StatMetric[] = [
  { key: "effectivenessScore", label: "Efectividad", sublabel: "pts / máx posible", icon: "🎯", color: "text-violet-300", format: (v) => `${v.toFixed(1)}%`, best: "max" },
  { key: "avgPointsPerMatch", label: "Puntos por partido", sublabel: "promedio", icon: "📈", color: "text-violet-300", format: (v) => v.toFixed(2), best: "max" },
  { key: "avgDistance", label: "Precisión", sublabel: "error medio + pen. de ganador", icon: "📐", color: "text-sky-300", format: (v) => v.toFixed(1), best: "min" },
  { key: "riskFactor", label: "Factor Riesgo", sublabel: "agresividad del pronóstico", icon: "🎲", color: "text-red-300", format: (v) => v.toFixed(1), best: "min" },
  { key: "exactRatio", label: "Resultado exacto", sublabel: "% de puntos por +3", icon: "✅", color: "text-emerald-300", format: (v) => `${v.toFixed(1)}%`, best: "max" },
  { key: "homeEffectiveness", label: "Efectividad local", sublabel: "% aciertos en local", icon: "🏠", color: "text-orange-300", format: (v) => `${v.toFixed(1)}%`, best: "max" },
  { key: "drawEffectiveness", label: "Efectividad empates", sublabel: "% aciertos en empates", icon: "⚖️", color: "text-zinc-300", format: (v) => `${v.toFixed(1)}%`, best: "max" },
  { key: "awayEffectiveness", label: "Efectividad visitantes", sublabel: "% aciertos en visitante", icon: "✈️", color: "text-blue-300", format: (v) => `${v.toFixed(1)}%`, best: "max" },
  { key: "maxStreak", label: "Mejor racha", sublabel: "bloques seguidos", icon: "🔥", color: "text-yellow-300", format: (v) => `${v}`, best: "max" },
  { key: "worstStreak", label: "Peor racha", sublabel: "bloques sin puntuar", icon: "🧊", color: "text-slate-400", format: (v) => `${v}`, best: "max" },
  { key: "maxExactStreak", label: "Racha de exactos", sublabel: "bloques seguidos", icon: "💎", color: "text-indigo-300", format: (v) => `${v}`, best: "max" },
  { key: "penaltyAccuracy", label: "Acierto en penales", sublabel: "% sobre penales reales", icon: "🎯", color: "text-cyan-300", format: (v) => `${v.toFixed(1)}%`, best: "max" },
  { key: "coverage", label: "Cobertura", sublabel: "% partidos predichos", icon: "📋", color: "text-teal-300", format: (v) => `${v.toFixed(1)}%`, best: "max" },
];

function calcOutcome(h: number, a: number) {
  return h > a ? "H" : h < a ? "A" : "D";
}

export function computePlayerStats(
  members: Member[],
  allPreds: Map<string, LivePred>,
  matches: Match[]
): PlayerStat[] {
  const finishedMatches = matches.filter((m) => m.homeGoals !== null && m.awayGoals !== null);
  const totalMatchesCount = finishedMatches.length;

  const blocks = new Map<number, Match[]>();
  for (const m of finishedMatches) {
    const t = new Date(m.kickoffAt).getTime();
    if (!blocks.has(t)) blocks.set(t, []);
    blocks.get(t)!.push(m);
  }
  const sortedTimes = Array.from(blocks.keys()).sort((a, b) => a - b);

  return members.map((mb) => {
    let pts = 0;
    let exactHits = 0;
    let playedPreds = 0;
    let totalDist = 0;
    let totalRisk = 0;
    let homeReal = 0;
    let homePts = 0;
    let awayReal = 0;
    let awayPts = 0;
    let drawReal = 0;
    let drawPts = 0;
    let realPenaltyMatches = 0;
    let penaltyCorrect = 0;

    let maxStreak = 0;
    let curStreak = 0;
    let worstStreak = 0;
    let curBadStreak = 0;
    let maxExactStreak = 0;
    let curExactStreak = 0;
    let hasParticipated = false;

    for (const time of sortedTimes) {
      const block = blocks.get(time)!;
      let blockHasPrediction = false;
      let blockAllPositive = true;
      let blockAllExact = true;

      for (const m of block) {
        const pred = allPreds.get(`${m.id}__${mb.userId}`);
        if (!pred) {
          blockAllPositive = false;
          blockAllExact = false;
          continue;
        }

        blockHasPrediction = true;
        playedPreds++;

        const realOutcome = calcOutcome(m.homeGoals!, m.awayGoals!);
        const predOutcome = calcOutcome(pred.h, pred.a);
        const isExact = pred.h === m.homeGoals && pred.a === m.awayGoals;
        const isOutcome = predOutcome === realOutcome;

        if (isExact) {
          pts += 3;
          exactHits += 1;
          if (realOutcome === "H") homePts += 3;
          else if (realOutcome === "A") awayPts += 3;
          else drawPts += 3;
        } else if (isOutcome) {
          pts += 1;
          if (realOutcome === "H") homePts += 1;
          else if (realOutcome === "A") awayPts += 1;
          else drawPts += 1;
        }

        if (realOutcome === "H") homeReal++;
        else if (realOutcome === "A") awayReal++;
        else if (realOutcome === "D") drawReal++;

        const homeDiff = Math.abs(pred.h - m.homeGoals!);
        const awayDiff = Math.abs(pred.a - m.awayGoals!);
        const outcomePenalty = predOutcome === realOutcome ? 0 : 1;
        const precisionPenalty = homeDiff + awayDiff + outcomePenalty;
        totalDist += precisionPenalty;

        const totalGoalsDiff = Math.abs((pred.h + pred.a) - (m.homeGoals! + m.awayGoals!));
        const marginDiff = Math.abs((pred.h - pred.a) - (m.homeGoals! - m.awayGoals!));
        totalRisk += totalGoalsDiff + marginDiff;

        if (m.decidedByPenalties) {
          realPenaltyMatches++;
          if (pred.penWinner === m.penWinner) penaltyCorrect++;
        }

        if (!isExact) blockAllExact = false;
        if (!isOutcome && !isExact) blockAllPositive = false;
      }

      if (!blockHasPrediction) {
        if (!hasParticipated) {
          curStreak = 0;
          curBadStreak = 0;
          curExactStreak = 0;
          continue;
        }

        curBadStreak += 1;
        worstStreak = Math.max(worstStreak, curBadStreak);
        curStreak = 0;
        curExactStreak = 0;
        continue;
      }

      hasParticipated = true;
      if (blockAllPositive) {
        curStreak += 1;
        maxStreak = Math.max(maxStreak, curStreak);
        curBadStreak = 0;
      } else {
        curBadStreak += 1;
        worstStreak = Math.max(worstStreak, curBadStreak);
        curStreak = 0;
      }

      if (blockAllExact && blockAllPositive) {
        curExactStreak += 1;
        maxExactStreak = Math.max(maxExactStreak, curExactStreak);
      } else {
        curExactStreak = 0;
      }
    }

    return {
      userId: mb.userId,
      displayName: mb.displayName,
      effectivenessScore: totalMatchesCount > 0 ? Math.round((pts / (totalMatchesCount * 3)) * 1000) / 10 : 0,
      exactRatio: totalMatchesCount > 0 ? Math.round((exactHits / totalMatchesCount) * 1000) / 10 : 0,
      avgDistance: playedPreds > 0 ? Math.round((totalDist / playedPreds) * 10) / 10 : 0,
      homeEffectiveness: homeReal > 0 ? Math.round((homePts / (homeReal * 3)) * 1000) / 10 : 0,
      awayEffectiveness: awayReal > 0 ? Math.round((awayPts / (awayReal * 3)) * 1000) / 10 : 0,
      drawEffectiveness: drawReal > 0 ? Math.round((drawPts / (drawReal * 3)) * 1000) / 10 : 0,
      avgPointsPerMatch: playedPreds > 0 ? Math.round((pts / playedPreds) * 100) / 100 : 0,
      coverage: totalMatchesCount > 0 ? Math.round((playedPreds / totalMatchesCount) * 1000) / 10 : 0,
      maxStreak,
      worstStreak,
      maxExactStreak,
      riskFactor: playedPreds > 0 ? Math.round((totalRisk / playedPreds) * 10) / 10 : 0,
      penaltyAccuracy: realPenaltyMatches > 0 ? Math.round((penaltyCorrect / realPenaltyMatches) * 1000) / 10 : 0,
      playedPreds,
      totalPlayed: finishedMatches.length,
    };
  });
}