import type { Member, LivePred, Match } from "./types";
import { PENALTY_DIST } from "./constants";

export type PlayerStat = {
  userId: string;
  displayName: string;
  /** % pts obtenidos / pts totales posibles del torneo (1 decimal) */
  effectivenessScore: number;
  /** % (pts por exactos) / (máximos pts posibles por exactos en el torneo) */
  exactRatio: number;
  /** distancia absoluta prom al resultado + penalización por tendencia */
  avgDistance: number;
  /** % efectividad en partidos que realmente ganó el local */
  homeEffectiveness: number;
  /** % efectividad en partidos que realmente ganó el visitante */
  awayEffectiveness: number;
  /** % efectividad en partidos que realmente terminaron en empate */
  drawEffectiveness: number;
  /** pts totales / cantidad de partidos jugados por el usuario */
  avgPointsPerMatch: number;
  /** % partidos predichos sobre total jugados */
  coverage: number;
  /** mejor racha: máximo partidos seguidos sumando al menos 1 pt */
  maxStreak: number;
  /** peor racha: máximo partidos seguidos con 0 pts */
  worstStreak: number;
  /** % acierto en penales sobre partidos que REALMENTE fueron a penales */
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
    let totalDist = 0;
    
    // Contadores de condiciones reales
    let homeReal = 0, homePts = 0;
    let awayReal = 0, awayPts = 0;
    let drawReal = 0, drawPts = 0;
    
    let realPenaltyMatches = 0, penaltyCorrect = 0;
    
    let maxStreak = 0, curStreak = 0;
    let worstStreak = 0, curBadStreak = 0;
    let hasStartedPlaying = false;

    for (const m of played) {
      const pred = allPreds.get(`${m.id}__${mb.userId}`);
      maxPts += 3;

      const realOutcome = calcOutcome(m.homeGoals!, m.awayGoals!);
      
      // Contabilizar condiciones reales del partido
      if (realOutcome === "H") homeReal++;
      else if (realOutcome === "A") awayReal++;
      else if (realOutcome === "D") drawReal++;

      if (m.decidedByPenalties) realPenaltyMatches++;

      if (!pred) {
        totalDist += PENALTY_DIST;
        // Si no predijo, suma 0 puntos -> rompe racha buena, suma a la mala
        if (hasStartedPlaying) {
          curBadStreak++;
          worstStreak = Math.max(worstStreak, curBadStreak);
          curStreak = 0;
        }
        continue;
      }

      hasStartedPlaying = true;

      playedPreds++;
      const exact = pred.h === m.homeGoals && pred.a === m.awayGoals;
      const predOutcome = calcOutcome(pred.h, pred.a);
      const outcomeOk = predOutcome === realOutcome;

      let matchPts = 0;
      if (exact) { matchPts = 3; exactHits++; }
      else if (outcomeOk) { matchPts = 1; }

      pts += matchPts;

      // Efectividad por condición según el resultado REAL
      if (realOutcome === "H") homePts += matchPts;
      else if (realOutcome === "A") awayPts += matchPts;
      else if (realOutcome === "D") drawPts += matchPts;

      // Penalización de distancia y tendencia
      let dist = Math.abs(pred.h - m.homeGoals!) + Math.abs(pred.a - m.awayGoals!);
      if (!outcomeOk) {
        dist += 4; // Penalidad extra por no acertar el signo
      }
      totalDist += dist;

      // Evaluar Rachas (>= 1 pt mantiene racha positiva, 0 pts corta y suma a negativa)
      if (matchPts > 0) {
        curStreak++;
        maxStreak = Math.max(maxStreak, curStreak);
        curBadStreak = 0;
      } else {
        curBadStreak++;
        worstStreak = Math.max(worstStreak, curBadStreak);
        curStreak = 0;
      }

      // Contar penales solo si el partido REALMENTE se definió por penales
      if (m.decidedByPenalties && pred.penWinner) {
        if (pred.penWinner === m.penWinner) {
          penaltyCorrect++;
        }
      }
    }

    const totalPlayed = played.length;
    const exactMaxPts = totalPlayed * 3;

    return {
      userId: mb.userId,
      displayName: mb.displayName,
      // 1. EFECTIVIDAD GENERAL
      effectivenessScore: maxPts > 0 ? Math.round((pts / maxPts) * 1000) / 10 : 0,
      // 2. MARCADOR EXACTO
      exactRatio: exactMaxPts > 0 ? Math.round(((exactHits * 3) / exactMaxPts) * 1000) / 10 : 0,
      // 3. MEJOR PRECISIÓN
      avgDistance: totalPlayed > 0 ? Math.round((totalDist / totalPlayed) * 10) / 10 : 0,
      // 4. EFECTIVIDAD POR CONDICIÓN
      homeEffectiveness: homeReal > 0 ? Math.round((homePts / (homeReal * 3)) * 1000) / 10 : 0,
      awayEffectiveness: awayReal > 0 ? Math.round((awayPts / (awayReal * 3)) * 1000) / 10 : 0,
      drawEffectiveness: drawReal > 0 ? Math.round((drawPts / (drawReal * 3)) * 1000) / 10 : 0,
      // 5. PPP
      avgPointsPerMatch: playedPreds > 0 ? Math.round((pts / playedPreds) * 100) / 100 : 0,
      coverage: totalPlayed > 0 ? Math.round((playedPreds / totalPlayed) * 1000) / 10 : 0,
      // 6. RACHAS
      maxStreak,
      worstStreak,
      // 7. PENALES
      penaltyAccuracy: realPenaltyMatches > 0 ? Math.round((penaltyCorrect / realPenaltyMatches) * 1000) / 10 : 0,
      playedPreds,
      totalPlayed,
    };
  });
}