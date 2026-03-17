// REEMPLAZAR en components/room/constants.ts
// (o donde vivan STAGE_ORDER y STAGE_LABELS en tu proyecto)

export const KO_STAGES = new Set(["R32", "R16", "QF", "SF", "TPP", "FINAL"]);

// Los playoffs van primero (cronológicamente son en marzo, antes del Mundial)
export const STAGE_ORDER = [
  "PO_SF",    // Repechaje semifinales (26 mar)
  "PO_F",     // Repechaje finales     (31 mar)
  "GROUP",
  "R32", "R16", "QF", "SF", "TPP", "FINAL",
];

export const STAGE_LABELS: Record<string, string> = {
  PO_SF:  "Repechaje - Semis",
  PO_F:   "Repechaje - Finales",
  GROUP:  "Grupos",
  R32:    "16avos",
  R16:    "Octavos",
  QF:     "Cuartos",
  SF:     "Semis",
  TPP:    "3°/4°",
  FINAL:  "Final",
};

export const MAX_VISIBLE_MEMBERS = 10;
export const MAX_VISIBLE_STANDINGS = 20;

/** Penalización de distancia para partidos no predichos */
export const PENALTY_DIST = 5;

export function modeLabel(p: string) {
  return p === "STRICT_PER_MATCH" ? "Mundial" : "Desafío";
}