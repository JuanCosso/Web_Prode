// components/room/constants.ts

export const KO_STAGES = new Set([
  "PO_SF", "PO_F",                          // repechaje — pueden ir a penales
  "R32", "R16", "QF", "SF", "TPP", "FINAL", // eliminatoria del Mundial
]);

export const STAGE_ORDER = [
  "PO_SF", "PO_F",
  "GROUP",
  "R32", "R16", "QF", "SF", "TPP", "FINAL",
];

export const STAGE_LABELS: Record<string, string> = {
  PO_SF:  "Repechaje · Semis",
  PO_F:   "Repechaje · Final",
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