"use client";

import { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";

// ─── Types ────────────────────────────────────────────────────────────────────
type MemberRole = "OWNER" | "ADMIN" | "MEMBER";
type Member = { id: string; userId: string; displayName: string; contributionText: string; role: MemberRole };
type PendingMember = { id: string; displayName: string };
type Match = {
  id: string; stage: string; group?: string | null; matchday: number;
  kickoffAt: string; kickoffLabel: string;
  homeTeam: string; awayTeam: string;
  homeGoals: number | null; awayGoals: number | null;
  decidedByPenalties: boolean; penWinner: string | null;
};
type MyPred = { matchId: string; predHomeGoals: number; predAwayGoals: number; predPenWinner?: string | null };
type LivePred = { matchId: string; userId: string; displayName: string; h: number; a: number; penWinner: string | null };
type StandingRow = {
  userId: string; displayName: string; contributionText: string;
  points: number; exactHits: number; outcomeHits: number;
};
type Room = {
  id: string; name: string; code: string;
  editPolicy: "STRICT_PER_MATCH" | "ALLOW_UNTIL_ROUND_CLOSE";
  accessType: "OPEN" | "CLOSED";
};
type Me = { id: string; displayName: string };

// ─── Constants ────────────────────────────────────────────────────────────────
const KO_STAGES = new Set(["R32", "R16", "QF", "SF", "TPP", "FINAL"]);
const STAGE_ORDER = ["GROUP", "R32", "R16", "QF", "SF", "TPP", "FINAL"];
const STAGE_LABELS: Record<string, string> = {
  GROUP: "Grupos", R32: "16avos", R16: "Octavos", QF: "Cuartos", SF: "Semis", TPP: "3°/4°", FINAL: "Final",
};
const MAX_VISIBLE_MEMBERS = 10;
const MAX_VISIBLE_STANDINGS = 20;
// Penalización de distancia para partidos no predichos
const PENALTY_DIST = 5;

function modeLabel(p: string) { return p === "STRICT_PER_MATCH" ? "Mundial" : "Desafío"; }

// ─── Flags ───────────────────────────────────────────────────────────────────
const TEAM_TO_CODE: Record<string, string> = {
  "Argentina": "ar", "Brasil": "br", "Francia": "fr", "Alemania": "de",
  "España": "es", "Portugal": "pt", "Inglaterra": "gb-eng", "Italia": "it",
  "Países Bajos": "nl", "Bélgica": "be", "Uruguay": "uy", "Colombia": "co",
  "México": "mx", "Sudáfrica": "za", "Corea del Sur": "kr", "Japón": "jp",
  "Marruecos": "ma", "Senegal": "sn", "Ghana": "gh", "Nigeria": "ng",
  "Estados Unidos": "us", "Canadá": "ca", "Australia": "au", "Croatia": "hr",
  "Dinamarca": "dk", "Suecia": "se", "Suiza": "ch", "Polonia": "pl",
  "Serbia": "rs", "Ecuador": "ec", "Qatar": "qa", "Arabia Saudita": "sa",
  "Irán": "ir", "Túnez": "tn", "Camerún": "cm", "Gales": "gb-wls",
  "Costa Rica": "cr", "Perú": "pe", "Chile": "cl", "Bolivia": "bo",
  "Paraguay": "py", "Venezuela": "ve", "Honduras": "hn", "Panamá": "pa",
  "Jamaica": "jm", "El Salvador": "sv", "Nueva Zelanda": "nz", "Eslovaquia": "sk",
  "Haití": "ht",
  "Escocia": "gb-sct",
  "Curazao": "cw",
  "Costa de Marfil": "ci",
  "Egipto": "eg",
  "Cabo Verde": "cv",
  "Noruega": "no",
  "Austria": "at",
  "Jordania": "jo",
  "Argelia": "dz",
  "Uzbekistán": "uz",
};
function flagCodeFor(t: string) { return TEAM_TO_CODE[t] ?? null; }
function Flag({ code, alt }: { code: string | null; alt: string }) {
  if (!code) return <span className="text-sm">🏴</span>;
  return (
    <img src={`https://flagcdn.com/20x15/${code}.png`} alt={alt} width={20} height={15}
      className="inline-block rounded-[2px] object-cover shrink-0"
      onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
  );
}

// ─── Pill color ───────────────────────────────────────────────────────────────
function getPillColor(m: Match, predH: number | null, predA: number | null): string {
  if (predH === null || predA === null) return "bg-white/10 text-white/50";
  if (m.homeGoals === null || m.awayGoals === null) return "bg-white/15 text-white/80";
  if (predH === m.homeGoals && predA === m.awayGoals) return "bg-emerald-500/30 text-emerald-300";
  const po = predH > predA ? "H" : predH < predA ? "A" : "D";
  const ro = m.homeGoals > m.awayGoals ? "H" : m.homeGoals < m.awayGoals ? "A" : "D";
  if (po === ro) return "bg-yellow-500/25 text-yellow-300";
  return "bg-red-500/20 text-red-300";
}

// ─── Stats ───────────────────────────────────────────────────────────────────
function calcOutcome(h: number, a: number) { return h > a ? "H" : h < a ? "A" : "D"; }

type PlayerStat = {
  userId: string;
  displayName: string;
  effectivenessScore: number; // % pts obtenidos / pts máximos posibles (1 decimal)
  exactRatio: number;         // % exactos sobre partidos predichos (1 decimal)
  avgDistance: number;        // distancia prom al resultado; no predichos = PENALTY_DIST
  homeEffectiveness: number;  // % efectividad apostando local
  awayEffectiveness: number;  // % efectividad apostando visitante
  avgPointsPerMatch: number;  // pts promedio por partido predicho
  coverage: number;           // % partidos predichos sobre total jugados
  maxStreak: number;          // racha máxima de partidos consecutivos con puntos
  worstStreak: number;        // peor racha: máx partidos seguidos sin sumar
  playedPreds: number;
  totalPlayed: number;
};

function computePlayerStats(
  members: Member[],
  allPreds: Map<string, LivePred>,
  matches: Match[]
): PlayerStat[] {
  const played = matches
  .filter((m) => m.homeGoals !== null && m.awayGoals !== null)
  .sort((a, b) => {
    // Primero por grupo (A, B, C...), luego por matchday dentro del grupo
    const gA = a.group ?? "ZZZ";
    const gB = b.group ?? "ZZZ";
    if (gA !== gB) return gA.localeCompare(gB);
    return (a.matchday ?? 0) - (b.matchday ?? 0);
  });

  return members.map((mb) => {
    let pts = 0, maxPts = 0, exactHits = 0, playedPreds = 0;
    let totalDist = 0, homeTotal = 0, homeCorrect = 0, awayTotal = 0, awayCorrect = 0;
    // ✅ FIX racha: todos los partidos jugados entran al array, no solo los predichos
    const streakBits: boolean[] = [];

    for (const m of played) {
      const pred = allPreds.get(`${m.id}__${mb.userId}`);
      maxPts += 3;

      if (!pred) {
        // No predicho → fallo en racha + penalización en distancia
        streakBits.push(false);
        totalDist += PENALTY_DIST;
        continue;
      }

      playedPreds++;
      const exact = pred.h === m.homeGoals && pred.a === m.awayGoals;
      const outcomeOk = !exact && calcOutcome(pred.h, pred.a) === calcOutcome(m.homeGoals!, m.awayGoals!);

      if (exact) { pts += 3; exactHits++; }
      else if (outcomeOk) { pts += 1; }

      streakBits.push(exact || outcomeOk);
      totalDist += Math.abs(pred.h - m.homeGoals!) + Math.abs(pred.a - m.awayGoals!);

      const po = calcOutcome(pred.h, pred.a);
      const ptm = exact ? 3 : outcomeOk ? 1 : 0;
      if (po === "H") { homeTotal++; homeCorrect += ptm; }
      else if (po === "A") { awayTotal++; awayCorrect += ptm; }
    }

    // Racha máxima y peor racha
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
      // 1 decimal para evitar empates visuales por redondeo
      effectivenessScore: maxPts > 0 ? Math.round((pts / maxPts) * 1000) / 10 : 0,
      exactRatio: playedPreds > 0 ? Math.round((exactHits / playedPreds) * 1000) / 10 : 0,
      // Distancia sobre TODOS los partidos jugados (penaliza no predichos)
      avgDistance: totalPlayed > 0 ? Math.round((totalDist / totalPlayed) * 10) / 10 : 0,
      homeEffectiveness: homeTotal > 0 ? Math.round((homeCorrect / (homeTotal * 3)) * 1000) / 10 : 0,
      awayEffectiveness: awayTotal > 0 ? Math.round((awayCorrect / (awayTotal * 3)) * 1000) / 10 : 0,
      avgPointsPerMatch: playedPreds > 0 ? Math.round((pts / playedPreds) * 100) / 100 : 0,
      coverage: totalPlayed > 0 ? Math.round((playedPreds / totalPlayed) * 1000) / 10 : 0,
      maxStreak,
      worstStreak,
      playedPreds,
      totalPlayed,
    };
  });
}

// ─── StatsModal ───────────────────────────────────────────────────────────────
function StatsModal({
  stats,
  me,
  onClose,
}: {
  stats: PlayerStat[];
  me: Me;
  onClose: () => void;
}) {
  if (typeof window === "undefined") return null;

  type Col = {
    label: string;
    sublabel: string;
    key: keyof PlayerStat;
    format: (v: number) => string;
    best: "max" | "min";
  };

  const cols: Col[] = [
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

  const sorted = [...stats].sort((a, b) => b.effectivenessScore - a.effectivenessScore);

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/75 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="relative bg-slate-900 border border-white/15 rounded-2xl w-full max-w-4xl shadow-2xl max-h-[85vh] flex flex-col">

          {/* Header */}
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

          {/* Tabla */}
          <div className="overflow-auto flex-1">
            <table className="w-full text-xs" style={{ minWidth: 660 }}>
              <thead className="sticky top-0 bg-slate-900 z-10">
                <tr className="border-b border-white/10">
                  <th className="px-4 py-3 text-left text-white/50 font-medium">Jugador</th>
                  {cols.map(c => (
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
                      className={[
                        "border-t border-white/5 transition",
                        isMe ? "bg-white/5" : "hover:bg-white/[0.02]",
                      ].join(" ")}
                    >
                      <td className="px-4 py-3 font-medium whitespace-nowrap">
                        <span className={isMe ? "text-white" : "text-white/70"}>
                          {s.displayName}
                        </span>
                        {isMe && <span className="ml-1.5 text-[10px] text-white/25">(vos)</span>}
                      </td>
                      {cols.map(c => {
                        const vals = stats.map(x => x[c.key] as number);
                        const bestVal = c.best === "max" ? Math.max(...vals) : Math.min(...vals);
                        const isBest = (s[c.key] as number) === bestVal && stats.length > 1;
                        return (
                          <td key={c.key as string} className="px-3 py-3 text-center tabular-nums">
                            <span className={[
                              "font-mono",
                              isBest
                                ? c.best === "max"
                                  ? "text-emerald-400 font-bold"
                                  : "text-sky-400 font-bold"
                                : isMe
                                  ? "text-white/80"
                                  : "text-white/45",
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

          {/* Footer leyenda */}
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

// ─── PendingModal ─────────────────────────────────────────────────────────────
function PendingModal({ pending, roomId, onApproved, onRejected, onClose }: {
  pending: PendingMember[]; roomId: string;
  onApproved: (m: Member) => void; onRejected: (id: string) => void; onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  async function approve(id: string) {
    setBusy(id);
    const res = await fetch(`/api/rooms/${roomId}/members/${id}/approve`, { method: "PATCH" });
    const data = await res.json();
    setBusy(null);
    if (res.ok) onApproved(data.member);
  }
  async function reject(id: string) {
    setBusy(id);
    await fetch(`/api/rooms/${roomId}/members/${id}/kick`, { method: "DELETE" });
    setBusy(null);
    onRejected(id);
  }
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Solicitudes pendientes</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-lg">✕</button>
        </div>
        {pending.length === 0
          ? <p className="text-sm text-white/50">No hay solicitudes pendientes.</p>
          : pending.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 py-2 border-t border-white/10">
              <span className="text-sm font-medium">{p.displayName}</span>
              <div className="flex gap-2">
                <button onClick={() => approve(p.id)} disabled={busy === p.id}
                  className="rounded-lg bg-white text-slate-950 px-3 py-1 text-xs font-semibold hover:bg-white/90 disabled:opacity-50 transition">
                  {busy === p.id ? "…" : "Aceptar"}
                </button>
                <button onClick={() => reject(p.id)} disabled={busy === p.id}
                  className="rounded-lg bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold hover:bg-red-600 hover:border-red-600 hover:text-white disabled:opacity-50 transition">
                  {busy === p.id ? "…" : "Rechazar"}
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}

// ─── MembersModal ─────────────────────────────────────────────────────────────
function MembersModal({ members, me, isOwner, canKick, onChangeRole, onKick, onClose }: {
  members: Member[]; me: Me; isOwner: boolean; canKick: boolean;
  onChangeRole: (id: string, role: "ADMIN" | "MEMBER") => void;
  onKick: (id: string, userId: string, name: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Todos los jugadores ({members.length})</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-lg">✕</button>
        </div>
        <div className="overflow-y-auto flex-1">
          {members.map((m) => {
            const isMe = m.userId === me.id;
            const isAdmin = m.role === "ADMIN" || m.role === "OWNER";
            const canRole = isOwner && !isMe && m.role !== "OWNER";
            const canKickThis = canKick && !isMe && m.role !== "OWNER";
            return (
              <div key={m.userId} className="flex items-center justify-between gap-3 py-2.5 border-b border-white/10 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  {isAdmin && <span className="text-sm shrink-0">{m.role === "OWNER" ? "👑" : "⭐"}</span>}
                  <span className={["text-sm font-medium truncate", isMe ? "text-white" : "text-white/80"].join(" ")}>
                    {m.displayName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {canRole && (
                    <button onClick={() => onChangeRole(m.id, isAdmin ? "MEMBER" : "ADMIN")}
                      className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] text-white/60 hover:bg-white/20 hover:text-white transition">
                      {isAdmin ? "−Admin" : "+Admin"}
                    </button>
                  )}
                  {canKickThis && (
                    <button onClick={() => { onKick(m.id, m.userId, m.displayName); onClose(); }}
                      className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/20 transition">
                      Expulsar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Componente principal ─────────────────────────────────────────────────────
export default function RoomClient({
  room, me,
  members: initialMembers,
  pendingMembers: initialPending = [],
  pendingCount: _unused = 0,
  canKick, canModerate = false, isOwner = false,
  matches, myPreds,
  standings: initialStandings,
  playedCount: _initialPlayedCount,
}: {
  room: Room; me: Me;
  members: Member[];
  pendingMembers?: PendingMember[];
  pendingCount?: number;
  canKick: boolean; canModerate?: boolean; isOwner?: boolean;
  matches: Match[]; myPreds: MyPred[];
  standings: StandingRow[];
  playedCount: number;
}) {
  const router = useRouter();
  const [members, setMembers] = useState(initialMembers);
  const [standings, setStandings] = useState(initialStandings);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>(initialPending);
  const [showPendingModal, setShowPendingModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [showAllStandings, setShowAllStandings] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  const [matchColWidth, setMatchColWidth] = useState(260);
  useEffect(() => {
    function update() { setMatchColWidth(window.innerWidth < 640 ? 160 : 260); }
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);

  const playedCount = useMemo(
    () => matches.filter((m) => m.homeGoals !== null && m.awayGoals !== null).length,
    [matches]
  );

  const stagesPresent = useMemo(() =>
    STAGE_ORDER.filter((s) => matches.some((m) => m.stage === s)), [matches]);
  const [activeStage, setActiveStage] = useState(() => stagesPresent[0] ?? "GROUP");

  const stageMatches = useMemo(() => matches.filter((m) => m.stage === activeStage), [matches, activeStage]);

  const stageLocked = useMemo(() => {
    if (room.editPolicy !== "ALLOW_UNTIL_ROUND_CLOSE") return false;
    const first = stageMatches.reduce<Match | null>(
      (min, m) => !min || new Date(m.kickoffAt) < new Date(min.kickoffAt) ? m : min, null
    );
    return first ? Date.now() >= new Date(first.kickoffAt).getTime() : false;
  }, [room.editPolicy, stageMatches]);

  function handleApproved(newMember: Member) {
    setPendingMembers((p) => p.filter((x) => x.id !== newMember.id));
    setMembers((p) => [...p, newMember]);
  }
  function handleRejected(memberId: string) {
    setPendingMembers((p) => p.filter((x) => x.id !== memberId));
  }

  async function kickMember(memberId: string, userId: string, displayName: string) {
    if (!confirm(`¿Expulsar a ${displayName}?`)) return;
    await fetch(`/api/rooms/${room.id}/members/${memberId}/kick`, { method: "DELETE" });
    setMembers((p) => p.filter((m) => m.id !== memberId));
  }

  async function changeRole(memberId: string, newRole: "ADMIN" | "MEMBER") {
    await fetch(`/api/rooms/${room.id}/members/${memberId}/role`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    setMembers((p) => p.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
  }

  async function deleteRoom() {
    if (!confirm("¿Eliminar la sala? Esta acción no se puede deshacer.")) return;
    await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    router.push("/");
  }

  async function leaveRoom() {
    if (!confirm("¿Salir de la sala? Tus predicciones se conservarán pero ya no aparecerás en el ranking.")) return;
    const res = await fetch(`/api/rooms/${room.id}/members/me`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
    } else {
      const data = await res.json().catch(() => ({}));
      alert(data?.error === "OWNER_CANNOT_LEAVE"
        ? "El Owner no puede salir. Podés eliminar la sala si ya no la necesitás."
        : "Error al salir de la sala.");
    }
  }

  const groups = useMemo(() => {
    if (activeStage !== "GROUP") return [];
    const map = new Map<string, Match[]>();
    for (const m of stageMatches) {
      const g = m.group ? String(m.group).toUpperCase() : "—";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [activeStage, stageMatches]);

  const myRole: MemberRole = members.find((m) => m.userId === me.id)?.role ?? "MEMBER";
  const membersOrdered = useMemo(() => {
    const rest = members.filter((m) => m.userId !== me.id);
    return [{ id: "ME", userId: me.id, displayName: me.displayName, contributionText: "", role: myRole } as Member, ...rest];
  }, [members, me.id, me.displayName, myRole]);

  const [draft, setDraft] = useState(() => {
    const by = new Map<string, MyPred>();
    for (const p of myPreds) by.set(p.matchId, p);
    const init: Record<string, { h: string; a: string; pen: string }> = {};
    for (const m of matches) {
      const p = by.get(m.id);
      init[m.id] = { h: p ? String(p.predHomeGoals) : "", a: p ? String(p.predAwayGoals) : "", pen: p?.predPenWinner ?? "" };
    }
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [allPredsByMatchUser, setAllPredsByMatchUser] = useState<Map<string, LivePred>>(new Map());

  function handleScoreInput(matchId: string, field: "h" | "a", raw: string) {
    const clean = raw.replace(/[^0-9]/g, "").replace(/^0+(\d)/, "$1").slice(0, 2);
    setDraft((dd) => ({ ...dd, [matchId]: { ...dd[matchId], [field]: clean } }));
  }

  async function loadPredictions(stage: string) {
    try {
      const res = await fetch(`/api/rooms/${room.id}/predictions?stage=${stage}`);
      if (!res.ok) return;
      const data = await res.json();
      const preds: LivePred[] = (data.predictions ?? []).map((p: any) => ({
        matchId: p.matchId, userId: p.userId, displayName: p.displayName,
        h: p.h, a: p.a, penWinner: p.penWinner ?? null,
      }));
      const stageMatchIds = new Set(matches.filter((m) => m.stage === stage).map((m) => m.id));
      setAllPredsByMatchUser((prev) => {
        const next = new Map(prev);
        for (const key of Array.from(next.keys())) {
          if (stageMatchIds.has(key.split("__")[0])) next.delete(key);
        }
        for (const p of preds) next.set(`${p.matchId}__${p.userId}`, p);
        return next;
      });
    } catch { /**/ }
  }

  useEffect(() => {
    const stages = [...new Set(matches.map((m) => m.stage))];
    for (const s of stages) loadPredictions(s);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [room.id]);

  useEffect(() => {
    loadPredictions(activeStage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStage]);

  useEffect(() => {
    let es: EventSource | undefined;
    try {
      es = new EventSource(`/api/rooms/${room.id}/live`);
      es.onmessage = (e) => {
        try {
          const preds: LivePred[] = JSON.parse(e.data);
          setAllPredsByMatchUser((prev) => {
            const next = new Map(prev);
            for (const p of preds) next.set(`${p.matchId}__${p.userId}`, p);
            return next;
          });
        } catch { /**/ }
      };
    } catch { /**/ }
    return () => { try { es?.close(); } catch { /**/ } };
  }, [room.id]);

  async function saveAll() {
    setSaving(true); setMsg("");
    const entries = Object.entries(draft).flatMap(([matchId, { h, a, pen }]) => {
      const hN = parseInt(h, 10); const aN = parseInt(a, 10);
      if (isNaN(hN) || isNaN(aN) || hN < 0 || aN < 0) return [];
      const match = matches.find((m) => m.id === matchId);
      return [{ matchId, predHomeGoals: hN, predAwayGoals: aN,
        predPenWinner: (match && KO_STAGES.has(match.stage) && pen.trim()) ? pen.trim() : null }];
    });

    const changedCount = entries.filter((e) => {
      const ex = allPredsByMatchUser.get(`${e.matchId}__${me.id}`);
      return !ex || ex.h !== e.predHomeGoals || ex.a !== e.predAwayGoals;
    }).length;

    const res = await fetch(`/api/rooms/${room.id}/predictions`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictions: entries }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (res.ok) {
      setMsg(changedCount === 0
        ? "Sin cambios nuevos."
        : `Guardado ✅ (${changedCount} ${changedCount === 1 ? "predicción nueva" : "predicciones nuevas o editadas"})`);
      loadPredictions(activeStage);
    } else {
      setMsg("Error al guardar.");
    }
  }

  const playerStats = useMemo(
    () => computePlayerStats(members, allPredsByMatchUser, matches),
    [members, allPredsByMatchUser, matches]
  );

  // ─── renderMatchTable ─────────────────────────────────────────────────────
  const renderMatchTable = (list: Match[], groupLabel?: string) => {
    const MATCH_COL = matchColWidth;
    const PLAYER_COL = 130;
    const tableMinWidth = MATCH_COL + membersOrdered.length * PLAYER_COL;
    const stickyBg = "#0d1526";

    return (
      <div className="rounded-3xl border border-white/12 bg-white/8 backdrop-blur overflow-hidden">
        {groupLabel && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="text-sm font-semibold">Grupo {groupLabel}</div>
            <div className="text-xs text-white/60">{list.length} partidos</div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="text-xs" style={{ minWidth: tableMinWidth, width: "100%", tableLayout: "fixed", borderCollapse: "separate", borderSpacing: 0 }}>
            <colgroup>
              <col style={{ width: MATCH_COL }} />
              {membersOrdered.map((mb) => <col key={mb.userId} style={{ width: PLAYER_COL }} />)}
            </colgroup>
            <thead>
              <tr>
                <th
                  className="px-3 py-2 text-left font-semibold"
                  style={{ position: "sticky", left: 0, zIndex: 20, background: stickyBg }}
                >
                  Partido
                </th>
                {membersOrdered.map((mb) => (
                  <th
                    key={mb.userId}
                    className={["px-2 py-2 text-center font-semibold bg-white/5",
                      mb.userId === me.id ? "text-white" : "text-white/80"].join(" ")}
                  >
                    <span className="block">{mb.displayName}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {list.map((m) => {
                const kickoff = new Date(m.kickoffAt);
                const isKO = KO_STAGES.has(m.stage);
                const hasResult = m.homeGoals !== null && m.awayGoals !== null;
                const lockedLocal = room.editPolicy === "ALLOW_UNTIL_ROUND_CLOSE"
                  ? stageLocked : Date.now() >= kickoff.getTime();
                const d = draft[m.id] ?? { h: "", a: "", pen: "" };
                const hN = parseInt(d.h, 10), aN = parseInt(d.a, 10);
                const showPenSelector = isKO && !isNaN(hN) && !isNaN(aN) && hN === aN && !lockedLocal;

                return (
                  <tr key={m.id} className="border-t border-white/8">
                    <td
                      className="px-3 py-2.5 align-top"
                      style={{ position: "sticky", left: 0, zIndex: 10, background: stickyBg }}
                    >
                      <div className="text-[10px] text-white/40 mb-0.5">{(m as any).kickoffLabel}</div>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <Flag code={flagCodeFor(m.homeTeam)} alt={m.homeTeam} />
                        <span className="font-medium">{m.homeTeam}</span>
                        <span className="text-white/30 text-[10px]">vs</span>
                        <Flag code={flagCodeFor(m.awayTeam)} alt={m.awayTeam} />
                        <span className="font-medium">{m.awayTeam}</span>
                      </div>
                      {hasResult && (
                        <div className="mt-0.5 text-[10px] text-white/50">
                          Real: <span className="font-bold text-white/80">{m.homeGoals}–{m.awayGoals}</span>
                          {m.decidedByPenalties && <span className="ml-1 text-yellow-400/70">pen: {m.penWinner}</span>}
                        </div>
                      )}
                      {showPenSelector && (
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] text-yellow-400/70">Pen:</span>
                          {[m.homeTeam, m.awayTeam].map((team) => (
                            <button key={team}
                              onClick={() => setDraft((dd) => ({ ...dd, [m.id]: { ...dd[m.id], pen: team } }))}
                              className={["text-[10px] px-2 py-0.5 rounded border transition",
                                d.pen === team ? "border-white/50 bg-white/15 text-white" : "border-white/20 text-white/50 hover:bg-white/10"
                              ].join(" ")}
                            >{team}</button>
                          ))}
                        </div>
                      )}
                    </td>

                    {membersOrdered.map((mb) => {
                      const isMeCol = mb.userId === me.id;
                      const pred = allPredsByMatchUser.get(`${m.id}__${mb.userId}`);
                      const colorPredH = hasResult ? (pred?.h ?? null) : (isMeCol ? (isNaN(hN) ? null : hN) : (pred?.h ?? null));
                      const colorPredA = hasResult ? (pred?.a ?? null) : (isMeCol ? (isNaN(aN) ? null : aN) : (pred?.a ?? null));
                      const pillColor = getPillColor(m, colorPredH, colorPredA);

                      return (
                        <td key={mb.userId} className="px-2 py-2 align-middle text-center">
                          {isMeCol ? (
                            hasResult ? (
                              <div className="flex flex-col items-center gap-1">
                                {pred != null ? (
                                  <>
                                    <span className={["inline-block rounded-full px-2.5 py-0.5 text-xs tabular-nums", pillColor].join(" ")}>
                                      {pred.h}–{pred.a}
                                    </span>
                                    {isKO && pred.penWinner && (
                                      <div className="text-[10px] text-yellow-400/70">pen: {pred.penWinner}</div>
                                    )}
                                  </>
                                ) : <span className="text-white/20">—</span>}
                              </div>
                            ) : (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    value={d.h}
                                    onChange={(e) => handleScoreInput(m.id, "h", e.target.value)}
                                    disabled={lockedLocal}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="w-9 rounded-lg bg-white/10 border border-white/20 px-1 py-1 text-center text-xs text-white outline-none focus:border-white/40 disabled:opacity-40"
                                    maxLength={2}
                                  />
                                  <span className="text-white/40">-</span>
                                  <input
                                    value={d.a}
                                    onChange={(e) => handleScoreInput(m.id, "a", e.target.value)}
                                    disabled={lockedLocal}
                                    inputMode="numeric"
                                    pattern="[0-9]*"
                                    className="w-9 rounded-lg bg-white/10 border border-white/20 px-1 py-1 text-center text-xs text-white outline-none focus:border-white/40 disabled:opacity-40"
                                    maxLength={2}
                                  />
                                </div>
                                {isKO && !isNaN(hN) && !isNaN(aN) && hN === aN && !lockedLocal && d.pen && (
                                  <div className="text-[10px] text-yellow-400/70 truncate max-w-[88px]">pen: {d.pen}</div>
                                )}
                              </div>
                            )
                          ) : (
                            pred != null ? (
                              <div className="flex flex-col items-center gap-1">
                                <span className={["inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold tabular-nums", pillColor].join(" ")}>
                                  {pred.h}–{pred.a}
                                </span>
                                {isKO && pred.penWinner && (
                                  <div className="text-[10px] text-yellow-400/70">pen: {pred.penWinner}</div>
                                )}
                              </div>
                            ) : <span className="text-white/20">—</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };

  const visibleMembers = membersOrdered.slice(0, MAX_VISIBLE_MEMBERS);
  const hasMoreMembers = membersOrdered.length > MAX_VISIBLE_MEMBERS;
  const visibleStandings = showAllStandings ? standings : standings.slice(0, MAX_VISIBLE_STANDINGS);
  const hasMoreStandings = standings.length > MAX_VISIBLE_STANDINGS;

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/img/LogoProde.webp')" }} />
        <div className="absolute inset-0 bg-slate-950/75" />
      </div>

      {showPendingModal && (
        <PendingModal pending={pendingMembers} roomId={room.id}
          onApproved={handleApproved} onRejected={handleRejected}
          onClose={() => setShowPendingModal(false)} />
      )}
      {showMembersModal && (
        <MembersModal members={membersOrdered} me={me} isOwner={isOwner} canKick={canKick}
          onChangeRole={changeRole} onKick={kickMember}
          onClose={() => setShowMembersModal(false)} />
      )}
      {showStatsModal && (
        <StatsModal stats={playerStats} me={me} onClose={() => setShowStatsModal(false)} />
      )}

      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">

          {/* ── Header ── */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">

              {/* Lado izquierdo */}
              <div className="min-w-0 flex-1">
                <div className="mb-1">
                  <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition">← Inicio</Link>
                </div>
                <h1 className="text-2xl font-bold">{room.name}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-white/50">
                  <span>Código: <span className="font-mono text-white/80">{room.code}</span></span>
                  <span>·</span>
                  <span>Modo: <span className="text-white/80">{modeLabel(room.editPolicy)}</span></span>
                  <span>·</span>
                  <span className={room.accessType === "CLOSED" ? "text-yellow-400" : "text-emerald-400"}>
                    {room.accessType === "CLOSED" ? "Cerrada 🔒" : "Abierta 🔓"}
                  </span>
                  <span>·</span>
                  <span>Jugados: <span className="text-white">{playedCount}</span>/{matches.length}</span>
                </div>
              </div>

              {/* Lado derecho: botones */}
              <div className="flex flex-wrap items-center justify-end gap-2 shrink-0">
                {(canKick || canModerate) && room.accessType === "CLOSED" && (
                  <button onClick={() => setShowPendingModal(true)}
                    className="relative rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/15">
                    Solicitudes
                    {pendingMembers.length > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-yellow-400 text-slate-900 text-[11px] font-bold w-5 h-5">
                        {pendingMembers.length}
                      </span>
                    )}
                  </button>
                )}
                <button onClick={saveAll} disabled={saving}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar predicciones"}
                </button>
                {!isOwner && (
                  <button onClick={leaveRoom}
                    className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20">
                    Salir de la sala
                  </button>
                )}
                {isOwner && (
                  <button onClick={deleteRoom}
                    className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20">
                    Eliminar sala
                  </button>
                )}
              </div>
            </div>

            {/* Chips jugadores */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {visibleMembers.map((m) => {
                const isMe = m.userId === me.id;
                const isAdmin = m.role === "ADMIN" || m.role === "OWNER";
                const canRole = isOwner && !isMe && m.role !== "OWNER";
                const showKick = canKick && !isMe && m.role !== "OWNER";
                return (
                  <span key={m.userId} className={[
                    "flex items-center gap-1 rounded-full px-2.5 py-1 border",
                    isMe ? "border-white/30 bg-white/15 text-white" : "border-white/15 bg-white/8 text-white/70",
                  ].join(" ")}>
                    {isAdmin && <span>{m.role === "OWNER" ? "👑" : "⭐"}</span>}
                    {m.displayName}
                    {canRole && (
                      <button onClick={() => changeRole(m.id, isAdmin ? "MEMBER" : "ADMIN")}
                        className="rounded-full border border-white/20 bg-white/10 px-1.5 py-px text-[10px] text-white/60 hover:bg-white/20 hover:text-white transition ml-1">
                        {isAdmin ? "−A" : "+A"}
                      </button>
                    )}
                    {showKick && (
                      <button onClick={() => kickMember(m.id, m.userId, m.displayName)}
                        className="rounded-full border border-red-500/30 bg-red-500/10 px-1.5 py-px text-[10px] text-red-400 hover:bg-red-500/20 transition ml-1">
                        ✕
                      </button>
                    )}
                  </span>
                );
              })}
              {hasMoreMembers && (
                <button onClick={() => setShowMembersModal(true)}
                  className="flex items-center gap-1 rounded-full px-2.5 py-1 border border-white/20 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition">
                  +{membersOrdered.length - MAX_VISIBLE_MEMBERS} más
                </button>
              )}
            </div>
          </div>

          {msg && <div className="mb-4 text-sm text-white/80">{msg}</div>}

          {room.editPolicy === "ALLOW_UNTIL_ROUND_CLOSE" && stageLocked && (
            <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
              🔒 La fase <strong>{STAGE_LABELS[activeStage] ?? activeStage}</strong> ya comenzó — no podés modificar tus predicciones para esta ronda.
            </div>
          )}

          <div className="flex flex-wrap gap-2 mb-5">
            {stagesPresent.map((s) => (
              <button key={s} onClick={() => setActiveStage(s)}
                className={["rounded-xl px-3 py-1.5 text-xs font-medium transition",
                  activeStage === s ? "bg-white text-slate-950" : "border border-white/20 text-white/70 hover:bg-white/10"
                ].join(" ")}>
                {STAGE_LABELS[s] ?? s}
              </button>
            ))}
          </div>

          {/* Contenido: tabla + panel derecho */}
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
            <div className="space-y-4 min-w-0 overflow-hidden">
              {activeStage === "GROUP"
                ? groups.map(([g, list]) => (
                    <div key={g}>{renderMatchTable(list, g)}</div>
                  ))
                : renderMatchTable(stageMatches)}
            </div>

            {/* Panel derecho */}
            <div className="space-y-4">

              {/* Posiciones */}
              <div className="rounded-3xl border border-white/12 bg-white/8 backdrop-blur overflow-hidden sticky top-4">
                <div className="px-5 py-4 border-b border-white/5">
                  <div className="text-sm font-semibold">Posiciones</div>
                </div>
                <div className="px-4 pb-4">
                  <table className="w-full text-xs">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-2 py-2 text-left">#</th>
                        <th className="px-2 py-2 text-left">Jugador</th>
                        <th className="px-2 py-2 text-center">Pts</th>
                        <th className="px-2 py-2 text-center text-emerald-400">+3</th>
                        <th className="px-2 py-2 text-center text-yellow-400">+1</th>
                      </tr>
                    </thead>
                    <tbody>
                      {visibleStandings.map((s, i) => (
                        <tr key={s.userId} className={["border-t border-white/10", s.userId === me.id ? "bg-white/5" : ""].join(" ")}>
                          <td className="px-2 py-2 text-white/50">{i + 1}</td>
                          <td className="px-2 py-2 font-medium truncate max-w-[100px]">
                            {s.displayName}
                            {s.contributionText && <div className="text-[10px] text-white/40 truncate">{s.contributionText}</div>}
                          </td>
                          <td className="px-2 py-2 text-center font-bold text-white">{s.points}</td>
                          <td className="px-2 py-2 text-center text-emerald-400">{s.exactHits}</td>
                          <td className="px-2 py-2 text-center text-yellow-400">{s.outcomeHits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {hasMoreStandings && (
                    <button
                      onClick={() => setShowAllStandings((v) => !v)}
                      className="mt-3 w-full rounded-xl border border-white/15 bg-white/5 py-1.5 text-xs text-white/60 hover:bg-white/10 hover:text-white transition">
                      {showAllStandings ? "Ver menos ↑" : `Ver ${standings.length - MAX_VISIBLE_STANDINGS} más ↓`}
                    </button>
                  )}
                </div>
              </div>

              {/* Estadísticas */}
              {playerStats.length > 0 && playedCount > 0 && (() => {
                const byEff      = [...playerStats].sort((a, b) => b.effectivenessScore - a.effectivenessScore)[0];
                const byExact    = [...playerStats].sort((a, b) => b.exactRatio - a.exactRatio)[0];
                const byDist     = [...playerStats].sort((a, b) => a.avgDistance - b.avgDistance)[0];
                const byHome     = [...playerStats].sort((a, b) => b.homeEffectiveness - a.homeEffectiveness)[0];
                const byAway     = [...playerStats].sort((a, b) => b.awayEffectiveness - a.awayEffectiveness)[0];
                const byPPM      = [...playerStats].sort((a, b) => b.avgPointsPerMatch - a.avgPointsPerMatch)[0];
                const byCoverage = [...playerStats].sort((a, b) => b.coverage - a.coverage)[0];
                const byStreak   = [...playerStats].sort((a, b) => b.maxStreak - a.maxStreak)[0];
                const byWorst    = [...playerStats].sort((a, b) => a.worstStreak - b.worstStreak)[0];

                const stats = [
                  { label: "Efectividad",        icon: "🎯", leader: byEff,      value: `${byEff.effectivenessScore}%`,              color: "text-violet-300" },
                  { label: "Marcador exacto",     icon: "✅", leader: byExact,    value: `${byExact.exactRatio}%`,                    color: "text-emerald-300" },
                  { label: "Mejor precisión",     icon: "📐", leader: byDist,     value: `${byDist.avgDistance} goles`,               color: "text-sky-300" },
                  { label: "Mejor en locales",    icon: "🏠", leader: byHome,     value: `${byHome.homeEffectiveness}%`,              color: "text-orange-300" },
                  { label: "Mejor en visitantes", icon: "✈️",  leader: byAway,     value: `${byAway.awayEffectiveness}%`,              color: "text-blue-300" },
                  { label: "Pts por partido",     icon: "📈", leader: byPPM,      value: `${byPPM.avgPointsPerMatch.toFixed(2)} pts`, color: "text-violet-300" },
                  { label: "Cobertura",           icon: "📋", leader: byCoverage, value: `${byCoverage.coverage}%`,                  color: "text-teal-300" },
                  { label: "Racha máxima",        icon: "🔥", leader: byStreak,   value: `${byStreak.maxStreak} seguidos`,            color: "text-yellow-300" },
                  { label: "Peor racha",          icon: "🧊", leader: byWorst,    value: `${byWorst.worstStreak} sin puntuar`,        color: "text-slate-400" },
                ];

                return (
                  <div className="rounded-3xl border border-white/12 bg-white/8 backdrop-blur overflow-hidden">
                    <div className="px-5 py-4 border-b border-white/5">
                      <div className="text-sm font-semibold">Estadísticas</div>
                    </div>
                    <div className="px-4 py-1">
                      {stats.map(({ label, icon, leader, value, color }) => (
                        <div key={label} className="flex items-center justify-between gap-2 py-2.5 border-b border-white/5 last:border-0">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-sm shrink-0">{icon}</span>
                            <div className="min-w-0">
                              <div className="text-[10px] text-white/40 leading-none mb-0.5">{label}</div>
                              <div className={["text-xs font-semibold truncate", leader.userId === me.id ? "text-white" : "text-white/80"].join(" ")}>
                                {leader.displayName}
                              </div>
                            </div>
                          </div>
                          <span className={["text-xs font-mono font-bold shrink-0", color].join(" ")}>{value}</span>
                        </div>
                      ))}
                    </div>
                    {/* Botón Ver más — estilo igual a ← Inicio */}
                    <div className="px-5 py-3 border-t border-white/5 flex justify-end">
                      <button
                        onClick={() => setShowStatsModal(true)}
                        className="text-xs text-white/40 hover:text-white/70 transition"
                      >
                        Ver más →
                      </button>
                    </div>
                  </div>
                );
              })()}

            </div>
          </div>

        </div>
      </section>
    </main>
  );
}