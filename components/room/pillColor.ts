import type { Match } from "./types";

export function getPillColor(
  m: Match,
  predH: number | null,
  predA: number | null
): string {
  if (predH === null || predA === null) return "bg-white/10 text-white/50";
  if (m.homeGoals === null || m.awayGoals === null) return "bg-white/15 text-white/80";
  if (predH === m.homeGoals && predA === m.awayGoals) return "bg-emerald-500/30 text-emerald-300";
  const po = predH > predA ? "H" : predH < predA ? "A" : "D";
  const ro = m.homeGoals > m.awayGoals ? "H" : m.homeGoals < m.awayGoals ? "A" : "D";
  if (po === ro) return "bg-yellow-500/25 text-yellow-300";
  return "bg-red-500/20 text-red-300";
}