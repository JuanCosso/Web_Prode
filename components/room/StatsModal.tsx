"use client";

import { createPortal } from "react-dom";
import type { Me } from "./types";
import type { PlayerStat } from "./stats";
import { PENALTY_DIST } from "./constants";

type Col = {
  label: string;
  sublabel: string;
  key: keyof PlayerStat;
  format: (v: number) => string;
  best: "max" | "min";
};

const COLS: Col[] = [
  { label: "Efectividad",  sublabel: "pts / máx posible",          key: "effectivenessScore", format: v => `${v}%`,      best: "max" },
  { label: "Exactos",      sublabel: "% marcadores exactos",       key: "exactRatio",         format: v => `${v}%`,      best: "max" },
  { label: "Precisión",    sublabel: "dist. prom. al resultado",   key: "avgDistance",        format: v => `${v}`,       best: "min" },
  { label: "Locales",      sublabel: "efect. apostando local",     key: "homeEffectiveness",  format: v => `${v}%`,      best: "max" },
  { label: "Visitantes",   sublabel: "efect. apostando visitante", key: "awayEffectiveness",  format: v => `${v}%`,      best: "max" },
  { label: "Pts/partido",  sublabel: "promedio por predicho",      key: "avgPointsPerMatch",  format: v => v.toFixed(2), best: "max" },
  { label: "Cobertura",    sublabel: "% partidos predichos",       key: "coverage",           format: v => `${v}%`,      best: "max" },
  { label: "Racha máx.",   sublabel: "partidos seguidos con pts",  key: "maxStreak",          format: v => `${v}`,       best: "max" },
  { label: "Peor racha",   sublabel: "partidos seguidos sin pts",  key: "worstStreak",        format: v => `${v}`,       best: "min" },
];

export function StatsModal({
  stats,
  me,
  onClose,
}: {
  stats: PlayerStat[];
  me: Me;
  onClose: () => void;
}) {
  if (typeof window === "undefined") return null;

  const sorted = [...stats].sort((a, b) => b.effectivenessScore - a.effectivenessScore);

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-slate-900 border border-white/15 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[85vh] flex flex-col">

          <div className="flex items-center justify-between px-5 py-4 border-b border-white/10 shrink-0">
            <div>
              <h2 className="font-semibold text-base">Estadísticas detalladas</h2>
              <p className="text-[11px] text-white/40 mt-0.5">
                {stats[0]?.totalPlayed ?? 0} partidos jugados · ordenado por efectividad
              </p>
            </div>
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-white/40 hover:text-white hover:bg-white/10 transition text-lg leading-none"
            >
              ✕
            </button>
          </div>

          <div className="overflow-auto flex-1">
            <table className="w-full text-xs" style={{ minWidth: 660 }}>
              <thead className="sticky top-0 bg-slate-900 z-10">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-white/50 font-medium">Jugador</th>
                  {COLS.map(c => (
                    <th key={c.key as string} className="px-3 py-3 text-center font-medium whitespace-nowrap">
                      <div className="text-white/70">{c.label}</div>
                      <div className="text-[10px] text-white/30 font-normal mt-px">{c.sublabel}</div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sorted.map((s) => {
                  const isMe = s.userId === me.id;
                  return (
                    <tr
                      key={s.userId}
                      className={["border-t border-white/5 transition", isMe ? "bg-white/5" : "hover:bg-white/[0.02]"].join(" ")}
                    >
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        <span className={isMe ? "text-white" : "text-white/70"}>{s.displayName}</span>
                        {isMe && <span className="ml-1.5 text-[10px] text-white/25">(vos)</span>}
                      </td>
                      {COLS.map(c => {
                        const vals = stats.map(x => x[c.key] as number);
                        const bestVal = c.best === "max" ? Math.max(...vals) : Math.min(...vals);
                        const isBest = (s[c.key] as number) === bestVal && stats.length > 1;
                        return (
                          <td key={c.key as string} className="px-3 py-3 text-center tabular-nums">
                            <span className={[
                              "font-mono",
                              isBest
                                ? c.best === "max" ? "text-emerald-400 font-bold" : "text-sky-400 font-bold"
                                : isMe ? "text-white/80" : "text-white/45",
                            ].join(" ")}>
                              {c.format(s[c.key] as number)}
                            </span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="px-5 py-3 border-t border-white/10 shrink-0 flex flex-wrap gap-x-5 gap-y-1 text-[10px] text-white/25">
            <span><span className="text-emerald-400 font-bold">verde</span> = mejor (mayor)</span>
            <span><span className="text-sky-400 font-bold">azul</span> = mejor (menor)</span>
            <span>Precisión: los no predichos suman {PENALTY_DIST} goles de penalización al promedio</span>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}