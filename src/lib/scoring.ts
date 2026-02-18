import type { Match, Prediction } from "@prisma/client";

export type ScoreBreakdown = {
  points: number;          // total puntos del partido
  exactHit: boolean;       // acertó exacto (3 pts)
  outcomeHit: boolean;     // acertó ganador/empate (1 pt)
  penaltyBonus: boolean;   // +1 por penales (solo KO y si hubo penales)
};

function outcome(h: number, a: number) {
  if (h === a) return "D";
  return h > a ? "H" : "A";
}

function isKnockout(stage: string) {
  // Ajustá si usás otros nombres: "R32", "R16", "QF", "SF", "F", etc.
  return stage !== "GROUP";
}

export function scorePrediction(match: Match, pred: Prediction | null): ScoreBreakdown {
  // Si no hay resultado real aún, no puntúa
  if (match.homeGoals === null || match.awayGoals === null || match.homeGoals === undefined || match.awayGoals === undefined) {
    return { points: 0, exactHit: false, outcomeHit: false, penaltyBonus: false };
  }

  if (!pred) {
    return { points: 0, exactHit: false, outcomeHit: false, penaltyBonus: false };
  }

  const exactHit = pred.predHomeGoals === match.homeGoals && pred.predAwayGoals === match.awayGoals;
  const outcomeHit = outcome(pred.predHomeGoals, pred.predAwayGoals) === outcome(match.homeGoals, match.awayGoals);

  let points = 0;
  if (exactHit) points += 3;
  else if (outcomeHit) points += 1;

  // Bonus penales: solo en eliminatoria y solo si realmente hubo penales
  let penaltyBonus = false;
  if (isKnockout(match.stage) && match.decidedByPenalties && match.penWinner) {
    if (pred.predPenWinner && pred.predPenWinner === match.penWinner) {
      points += 1;
      penaltyBonus = true;
    }
  }

  return { points, exactHit, outcomeHit, penaltyBonus };
}
