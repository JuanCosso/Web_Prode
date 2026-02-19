"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

type Room = { id: string; name: string; code: string; editPolicy: string; accessType: "OPEN" | "CLOSED" };
type Me = { id: string; displayName: string };
type MemberRole = "OWNER" | "ADMIN" | "MEMBER";
type Member = { id: string; userId: string; displayName: string; contributionText: string; role: MemberRole };
type PendingMember = { id: string; displayName: string };
type Match = {
  id: string; stage: string; group: string | null; matchday: number | null;
  kickoffAt: string | Date; kickoffLabel: string;
  homeTeam: string; awayTeam: string;
  homeGoals: number | null; awayGoals: number | null;
  decidedByPenalties: boolean; penWinner: string | null;
};
type MyPred = { matchId: string; predHomeGoals: number; predAwayGoals: number; predPenWinner: string | null };
type StandingRow = { userId: string; displayName: string; points: number; exactHits: number; outcomeHits: number; contributionText?: string | null };
type LivePred = { matchId: string; userId: string; displayName: string; h: number; a: number };

// ── Fases ────────────────────────────────────────────────────────────────────
const STAGE_ORDER = ["GROUP", "R32", "R16", "QF", "SF", "TPP", "FINAL"];
const STAGE_LABELS: Record<string, string> = {
  GROUP: "Grupos", R32: "16avos", R16: "Octavos", QF: "Cuartos",
  SF: "Semis", TPP: "3°/4°", FINAL: "Final",
};
const KO_STAGES = new Set(["R32", "R16", "QF", "SF", "TPP", "FINAL"]);

function modeLabel(p: string) { return p === "ALLOW_UNTIL_ROUND_CLOSE" ? "Desafío" : "Mundial"; }

// ── Banderas via flagcdn.com ──────────────────────────────────────────────────
function normTeam(s: string) {
  return (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim();
}
const FLAGS: Record<string, string> = {
  argentina:"ar",brasil:"br",brazil:"br",uruguay:"uy",paraguay:"py",chile:"cl",
  colombia:"co",ecuador:"ec",peru:"pe",venezuela:"ve",bolivia:"bo",
  mexico:"mx","méxico":"mx",canada:"ca","canadá":"ca","estados unidos":"us",usa:"us",
  alemania:"de",germany:"de",francia:"fr",france:"fr",espana:"es","españa":"es",spain:"es",
  italia:"it",italy:"it",portugal:"pt","paises bajos":"nl","países bajos":"nl",
  netherlands:"nl",holanda:"nl",belgica:"be","bélgica":"be",belgium:"be",
  suiza:"ch",switzerland:"ch",sudafrica:"za","sudáfrica":"za","south africa":"za",
  japon:"jp","japón":"jp",japan:"jp","corea del sur":"kr","south korea":"kr",
  qatar:"qa",marruecos:"ma",morocco:"ma",haiti:"ht","haití":"ht",
  escocia:"gb-sct",australia:"au",curazao:"cw","costa de marfil":"ci",
  tunez:"tn","túnez":"tn",iran:"ir","irán":"ir",egipto:"eg","nueva zelanda":"nz",
  "cabo verde":"cv","arabia saudita":"sa",senegal:"sn",noruega:"no",austria:"at",
  jordania:"jo",argelia:"dz",uzbekistan:"uz","uzbekistán":"uz",
  inglaterra:"gb-eng",croacia:"hr",ghana:"gh",panama:"pa","panamá":"pa",
  dinamarca:"dk",suecia:"se",turquia:"tr","turquía":"tr",ucrania:"ua",
  serbia:"rs",nigeria:"ng",camerun:"cm","camerún":"cm",gales:"gb-wls","costa rica":"cr",
};
function flagCodeFor(t: string) { return FLAGS[normTeam(t)] || ""; }
function Flag({ code, alt }: { code?: string; alt: string }) {
  const c = (code || "").toLowerCase().trim();
  if (!c) return null;
  return (
    <img
      src={`https://flagcdn.com/h24/${c}.png`}
      srcSet={`https://flagcdn.com/h48/${c}.png 2x`}
      height={24} width={36}
      className="h-4 w-6 rounded-[3px] border border-white/10 object-cover shrink-0"
      alt={alt} loading="lazy"
    />
  );
}

// ─── Modal de solicitudes pendientes ─────────────────────────────────────────
function PendingModal({
  pending, roomId, onApproved, onRejected, onClose,
}: {
  pending: PendingMember[]; roomId: string;
  onApproved: (m: Member) => void; onRejected: (id: string) => void; onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function approve(memberId: string) {
    setBusy(memberId);
    const res = await fetch(`/api/rooms/${roomId}/members/${memberId}/approve`, { method: "PATCH" });
    const data = await res.json();
    setBusy(null);
    if (res.ok) onApproved(data.member);
  }
  async function reject(memberId: string) {
    setBusy(memberId);
    await fetch(`/api/rooms/${roomId}/members/${memberId}/kick`, { method: "DELETE" });
    setBusy(null);
    onRejected(memberId);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Solicitudes pendientes</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-lg">✕</button>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-white/50">No hay solicitudes pendientes.</p>
        ) : pending.map((p) => (
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

// ─── Componente principal ─────────────────────────────────────────────────────
export default function RoomClient({
  room, me,
  members: initialMembers,
  pendingMembers: initialPending = [],
  pendingCount: _unused = 0,
  canKick, canModerate = false, isOwner = false,
  matches, myPreds,
  standings: initialStandings,
  playedCount,
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

  // ── Tabs de fase ──────────────────────────────────────────────────────────
  const stagesPresent = useMemo(() =>
    STAGE_ORDER.filter((s) => matches.some((m) => m.stage === s)),
    [matches]
  );
  const [activeStage, setActiveStage] = useState(() => stagesPresent[0] ?? "GROUP");

  const stageMatches = useMemo(() =>
    matches
      .filter((m) => m.stage === activeStage)
      .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime()),
    [matches, activeStage]
  );

  // ── Lock de fase para modo Desafío ────────────────────────────────────────
  const stageLocked = useMemo(() => {
    if (room.editPolicy !== "ALLOW_UNTIL_ROUND_CLOSE") return false;
    const earliest = stageMatches.reduce<Date | null>((acc, m) => {
      const d = new Date(m.kickoffAt);
      return !acc || d < acc ? d : acc;
    }, null);
    return !!earliest && Date.now() >= earliest.getTime();
  }, [room.editPolicy, stageMatches]);

  function handleApproved(newMember: Member) {
    setPendingMembers((prev) => prev.filter((p) => p.id !== newMember.id));
    setMembers((prev) => prev.some((m) => m.id === newMember.id) ? prev : [...prev, newMember]);
    setStandings((prev) => prev.some((s) => s.userId === newMember.userId) ? prev : [
      ...prev,
      { userId: newMember.userId, displayName: newMember.displayName, points: 0, exactHits: 0, outcomeHits: 0, contributionText: newMember.contributionText },
    ]);
  }
  function handleRejected(memberId: string) {
    setPendingMembers((prev) => prev.filter((p) => p.id !== memberId));
  }

  async function kickMember(memberId: string, userId: string, displayName: string) {
    if (!confirm(`¿Expulsar a "${displayName}"?\n\nEsta acción no se puede deshacer.`)) return;
    const res = await fetch(`/api/rooms/${room.id}/members/${memberId}/kick`, { method: "DELETE" });
    if (!res.ok) { alert("Error al expulsar"); return; }
    setMembers((prev) => prev.filter((m) => m.id !== memberId));
    setStandings((prev) => prev.filter((s) => s.userId !== userId));
  }

  async function deleteRoom() {
    if (!confirm("Vas a eliminar la sala. Esto borra todo. ¿Confirmás?")) return;
    const res = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    if (!res.ok) { alert("No se pudo eliminar"); return; }
    router.push("/");
  }

  async function changeRole(memberId: string, newRole: "ADMIN" | "MEMBER") {
    const res = await fetch(`/api/rooms/${room.id}/members/${memberId}/role`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ role: newRole }),
    });
    if (!res.ok) { alert("No se pudo cambiar el rol"); return; }
    setMembers((prev) => prev.map((m) => m.id === memberId ? { ...m, role: newRole } : m));
  }

  // Grupos (solo para stage GROUP)
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
      init[m.id] = {
        h: p ? String(p.predHomeGoals) : "",
        a: p ? String(p.predAwayGoals) : "",
        pen: p?.predPenWinner ?? "",
      };
    }
    return init;
  });

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState("");
  const [liveByMatchUser, setLiveByMatchUser] = useState<Map<string, LivePred>>(new Map());

  useEffect(() => {
    const es = new EventSource(`/api/rooms/${room.id}/live`);
    es.onmessage = (e) => {
      try {
        const preds: LivePred[] = JSON.parse(e.data);
        const m = new Map<string, LivePred>();
        for (const p of preds) m.set(`${p.matchId}__${p.userId}`, p);
        setLiveByMatchUser(m);
      } catch { /**/ }
    };
    return () => es.close();
  }, [room.id]);

  async function saveAll() {
    setSaving(true); setMsg("");
    const entries = Object.entries(draft).flatMap(([matchId, { h, a, pen }]) => {
      const hN = parseInt(h, 10); const aN = parseInt(a, 10);
      if (isNaN(hN) || isNaN(aN)) return [];
      const match = matches.find((m) => m.id === matchId);
      return [{
        matchId,
        predHomeGoals: hN,
        predAwayGoals: aN,
        predPenWinner: (match && KO_STAGES.has(match.stage) && pen.trim()) ? pen.trim() : null,
      }];
    });
    const res = await fetch(`/api/rooms/${room.id}/predictions`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ predictions: entries }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    setMsg(res.ok ? `Guardado ✅ (${data.saved ?? 0} predicciones)` : "Error al guardar.");
  }

  // ── Tabla de partidos (reutilizable) ──────────────────────────────────────
  function MatchTable({ list, groupLabel }: { list: Match[]; groupLabel?: string }) {
    return (
      <div className="rounded-3xl border border-white/12 bg-white/8 backdrop-blur overflow-hidden">
        {groupLabel && (
          <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
            <div className="text-sm font-semibold">Grupo {groupLabel}</div>
            <div className="text-xs text-white/60">{list.length} partidos</div>
          </div>
        )}
        <div className="px-4 pb-4 pt-2">
          <div className="overflow-x-auto">
            <table className="min-w-[700px] w-full text-xs">
              <thead className="bg-white/5">
                <tr>
                  <th className="px-3 py-2 text-left w-[280px]">Partido</th>
                  <th className="px-3 py-2 text-center text-white/50 w-16">Real</th>
                  {membersOrdered.map((mb) => (
                    <th key={mb.userId} className={["px-2 py-2 text-center whitespace-nowrap", mb.userId === me.id ? "text-white" : "text-white/80"].join(" ")}>
                      {mb.displayName}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {list.map((m) => {
                  const kickoff = new Date(m.kickoffAt);
                  const isKO = KO_STAGES.has(m.stage);
                  const hasResult = m.homeGoals !== null && m.awayGoals !== null;

                  let lockedLocal = false;
                  if (room.editPolicy === "ALLOW_UNTIL_ROUND_CLOSE") {
                    lockedLocal = stageLocked;
                  } else {
                    lockedLocal = Date.now() >= kickoff.getTime();
                  }

                  const d = draft[m.id] ?? { h: "", a: "", pen: "" };
                  const hN = parseInt(d.h, 10);
                  const aN = parseInt(d.a, 10);
                  const isDraw = !isNaN(hN) && !isNaN(aN) && hN === aN;
                  const showPenSelector = isKO && isDraw && !lockedLocal;

                  return (
                    <tr key={m.id} className="border-t border-white/8">
                      <td className="px-3 py-2.5">
                        <div className="text-[10px] text-white/40 mb-0.5">{(m as any).kickoffLabel}</div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Flag code={flagCodeFor(m.homeTeam)} alt={m.homeTeam} />
                          <span className="font-medium">{m.homeTeam}</span>
                          <span className="text-white/30">vs</span>
                          <Flag code={flagCodeFor(m.awayTeam)} alt={m.awayTeam} />
                          <span className="font-medium">{m.awayTeam}</span>
                        </div>
                        {showPenSelector && (
                          <div className="mt-1.5 flex items-center gap-1.5">
                            <span className="text-[10px] text-yellow-400/70">Pen:</span>
                            <button
                              onClick={() => setDraft((dd) => ({ ...dd, [m.id]: { ...dd[m.id], pen: m.homeTeam } }))}
                              className={["text-[10px] px-2 py-0.5 rounded border transition",
                                d.pen === m.homeTeam ? "border-white/50 bg-white/15 text-white" : "border-white/20 text-white/50 hover:bg-white/10"
                              ].join(" ")}
                            >{m.homeTeam}</button>
                            <button
                              onClick={() => setDraft((dd) => ({ ...dd, [m.id]: { ...dd[m.id], pen: m.awayTeam } }))}
                              className={["text-[10px] px-2 py-0.5 rounded border transition",
                                d.pen === m.awayTeam ? "border-white/50 bg-white/15 text-white" : "border-white/20 text-white/50 hover:bg-white/10"
                              ].join(" ")}
                            >{m.awayTeam}</button>
                          </div>
                        )}
                      </td>

                      {/* Resultado real */}
                      <td className="px-3 py-2 text-center">
                        {hasResult ? (
                          <div>
                            <span className="font-bold text-green-400">{m.homeGoals}–{m.awayGoals}</span>
                            {m.decidedByPenalties && (
                              <div className="text-[10px] text-yellow-400/80 mt-0.5">pen: {m.penWinner}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-white/20">—</span>
                        )}
                      </td>

                      {/* Columnas por jugador */}
                      {membersOrdered.map((mb) => {
                        const isMeCol = mb.userId === me.id;
                        const livePred = liveByMatchUser.get(`${m.id}__${mb.userId}`);
                        return (
                          <td key={mb.userId} className="px-2 py-2">
                            {isMeCol ? (
                              <div className="flex flex-col items-center gap-1">
                                <div className="flex items-center gap-1">
                                  <input
                                    value={d.h}
                                    onChange={(e) => setDraft((dd) => ({ ...dd, [m.id]: { ...dd[m.id], h: e.target.value } }))}
                                    disabled={lockedLocal}
                                    className="w-9 rounded-lg bg-white/10 border border-white/20 px-1 py-1 text-center text-xs text-white outline-none focus:border-white/40 disabled:opacity-40"
                                    maxLength={2}
                                  />
                                  <span className="text-white/40">-</span>
                                  <input
                                    value={d.a}
                                    onChange={(e) => setDraft((dd) => ({ ...dd, [m.id]: { ...dd[m.id], a: e.target.value } }))}
                                    disabled={lockedLocal}
                                    className="w-9 rounded-lg bg-white/10 border border-white/20 px-1 py-1 text-center text-xs text-white outline-none focus:border-white/40 disabled:opacity-40"
                                    maxLength={2}
                                  />
                                </div>
                                {isKO && d.pen && (
                                  <div className="text-[10px] text-yellow-400/70 truncate max-w-[90px]">pen: {d.pen}</div>
                                )}
                              </div>
                            ) : (
                              <div className="text-center text-white/60">
                                {livePred ? `${livePred.h}-${livePred.a}` : "—"}
                              </div>
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
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/img/wallpaper.webp')" }} />
        <div className="absolute inset-0 bg-slate-950/75" />
      </div>

      {showPendingModal && (
        <PendingModal
          pending={pendingMembers} roomId={room.id}
          onApproved={handleApproved} onRejected={handleRejected}
          onClose={() => setShowPendingModal(false)}
        />
      )}

      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">

          {/* Header */}
          <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
            <div>
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
                {/* ✅ FIX: playedCount sobre total real de partidos */}
                <span>Jugados: <span className="text-white">{playedCount}</span>/{matches.length}</span>
              </div>

              {/* Chips de miembros */}
              <div className="mt-2 flex flex-wrap gap-1.5 text-xs">
                {membersOrdered.map((m) => {
                  const isMe = m.userId === me.id;
                  const isAdminRole = m.role === "ADMIN" || m.role === "OWNER";
                  const canChangeRole = isOwner && !isMe && m.role !== "OWNER";
                  const showKick = canKick && !isMe && m.role !== "OWNER";
                  return (
                    <span key={m.userId} className={["flex items-center gap-1 rounded-full px-2.5 py-1 border",
                      isMe ? "border-white/30 bg-white/15 text-white" : "border-white/15 bg-white/8 text-white/70"
                    ].join(" ")}>
                      {isAdminRole && <span>{m.role === "OWNER" ? "👑" : "⭐"}</span>}
                      {m.displayName}
                      {canChangeRole && (
                        <button onClick={() => changeRole(m.id, isAdminRole ? "MEMBER" : "ADMIN")}
                          className="rounded-full border border-white/20 bg-white/10 px-1.5 py-px text-[10px] text-white/60 hover:bg-white/20 hover:text-white transition ml-1">
                          {isAdminRole ? "−A" : "+A"}
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
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
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
              {isOwner && (
                <button onClick={deleteRoom}
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20">
                  Eliminar sala
                </button>
              )}
            </div>
          </div>

          {msg && <div className="mb-4 text-sm text-white/80">{msg}</div>}

          {/* Aviso de lock modo Desafío */}
          {room.editPolicy === "ALLOW_UNTIL_ROUND_CLOSE" && stageLocked && (
            <div className="mb-4 rounded-2xl border border-yellow-500/30 bg-yellow-500/10 px-4 py-3 text-sm text-yellow-300">
              🔒 La fase <strong>{STAGE_LABELS[activeStage] ?? activeStage}</strong> ya comenzó — no podés modificar tus predicciones para esta ronda.
            </div>
          )}

          {/* ✅ Tabs de fase */}
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

          {/* Contenido principal */}
          <div className="grid gap-6 lg:grid-cols-[1fr_280px]">
            <div className="space-y-4">
              {activeStage === "GROUP" ? (
                groups.map(([g, list]) => <MatchTable key={g} list={list} groupLabel={g} />)
              ) : (
                <MatchTable list={stageMatches} />
              )}
            </div>

            {/* ✅ Posiciones con +3 y +1 */}
            <div>
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
                        <th className="px-2 py-2 text-center text-blue-400">+1</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s, i) => (
                        <tr key={s.userId} className={["border-t border-white/10", s.userId === me.id ? "bg-white/5" : ""].join(" ")}>
                          <td className="px-2 py-2 text-white/50">{i + 1}</td>
                          <td className="px-2 py-2 font-medium truncate max-w-[100px]">
                            {s.displayName}
                            {s.contributionText && (
                              <div className="text-[10px] text-white/40 truncate">{s.contributionText}</div>
                            )}
                          </td>
                          <td className="px-2 py-2 text-center font-bold text-white">{s.points}</td>
                          <td className="px-2 py-2 text-center text-emerald-400">{s.exactHits}</td>
                          <td className="px-2 py-2 text-center text-blue-400">{s.outcomeHits}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}