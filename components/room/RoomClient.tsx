"use client";

import { useState, useMemo, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import type { Member, PendingMember, Match, MyPred, LivePred, StandingRow, Room, Me } from "./types";
import { KO_STAGES, STAGE_ORDER, STAGE_LABELS, MAX_VISIBLE_MEMBERS, MAX_VISIBLE_STANDINGS, modeLabel } from "./constants";
import { computePlayerStats } from "./stats";
import type { PlayerStat } from "./stats";
import { StatsModal } from "./StatsModal";
import { PendingModal } from "./PendingModal";
import { MembersModal } from "./MembersModal";
import { MatchTable } from "./MatchTable";

type MemberRole = "OWNER" | "ADMIN" | "MEMBER";

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

  // ─── Estado ───────────────────────────────────────────────────────────────
  const [members, setMembers] = useState(initialMembers);
  const [standings, setStandings] = useState(initialStandings);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>(initialPending);
  const [amIOwner, setAmIOwner] = useState(isOwner);

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

  // ─── Stages ───────────────────────────────────────────────────────────────
  const playedCount = useMemo(
    () => matches.filter((m) => m.homeGoals !== null && m.awayGoals !== null).length,
    [matches]
  );
  const stagesPresent = useMemo(
    () => STAGE_ORDER.filter((s) => matches.some((m) => m.stage === s)),
    [matches]
  );
  const [activeStage, setActiveStage] = useState(() => stagesPresent[0] ?? "GROUP");
  const stageMatches = useMemo(
    () => matches.filter((m) => m.stage === activeStage),
    [matches, activeStage]
  );
  const stageLocked = useMemo(() => {
    if (room.editPolicy !== "ALLOW_UNTIL_ROUND_CLOSE") return false;
    const first = stageMatches.reduce<Match | null>(
      (min, m) => !min || new Date(m.kickoffAt) < new Date(min.kickoffAt) ? m : min, null
    );
    return first ? Date.now() >= new Date(first.kickoffAt).getTime() : false;
  }, [room.editPolicy, stageMatches]);

  // ─── Grupos (solo GROUP) ──────────────────────────────────────────────────
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

  // ─── Miembros ordenados (yo primero) ──────────────────────────────────────
  const myRole: MemberRole = members.find((m) => m.userId === me.id)?.role ?? "MEMBER";
  const membersOrdered = useMemo(() => {
    const rest = members.filter((m) => m.userId !== me.id);
    return [
      { id: "ME", userId: me.id, displayName: me.displayName, contributionText: "", role: myRole } as Member,
      ...rest,
    ];
  }, [members, me.id, me.displayName, myRole]);

  // ─── Draft de predicciones ────────────────────────────────────────────────
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
  const [allPredsByMatchUser, setAllPredsByMatchUser] = useState<Map<string, LivePred>>(new Map());

  // ─── Handlers de inputs ───────────────────────────────────────────────────
  function handleScoreInput(matchId: string, field: "h" | "a", raw: string) {
    const clean = raw.replace(/[^0-9]/g, "").replace(/^0+(\d)/, "$1").slice(0, 2);
    setDraft((dd) => ({ ...dd, [matchId]: { ...dd[matchId], [field]: clean } }));
  }

  function handlePenSelect(matchId: string, team: string) {
    setDraft((dd) => ({ ...dd, [matchId]: { ...dd[matchId], pen: team } }));
  }

  // ─── Carga de predicciones ────────────────────────────────────────────────
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

  // ─── SSE live ────────────────────────────────────────────────────────────
  useEffect(() => {
    let es: EventSource | undefined;
    try {
      es = new EventSource(`/api/rooms/${room.id}/live`);
   
      es.onmessage = (e) => {
        try {
          const msg: { type: string; payload: unknown[] } = JSON.parse(e.data);
   
          if (msg.type === "preds") {
            // Predicciones de otro usuario — actualizar tabla en tiempo real
            const preds = msg.payload as LivePred[];
            setAllPredsByMatchUser((prev) => {
              const next = new Map(prev);
              for (const p of preds) next.set(`${p.matchId}__${p.userId}`, p);
              return next;
            });
          } else if (msg.type === "match_update") {
            // Admin cargó resultados — revalidar datos del servidor
            // (actualiza matches, standings y el lock visual del stage)
            router.refresh();
          }
        } catch { /**/ }
      };
   
      es.onerror = () => {
        // El navegador reintenta automáticamente — no hace falta hacer nada
      };
    } catch { /**/ }
   
    return () => { try { es?.close(); } catch { /**/ } };
  }, [room.id]);

  // ─── Guardar predicciones ─────────────────────────────────────────────────
  async function saveAll() {
    setSaving(true); setMsg("");
    const entries = Object.entries(draft).flatMap(([matchId, { h, a, pen }]) => {
      const hN = parseInt(h, 10); const aN = parseInt(a, 10);
      if (isNaN(hN) || isNaN(aN) || hN < 0 || aN < 0) return [];
      const match = matches.find((m) => m.id === matchId);
      return [{
        matchId, predHomeGoals: hN, predAwayGoals: aN,
        predPenWinner: (match && KO_STAGES.has(match.stage) && pen.trim()) ? pen.trim() : null,
      }];
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

  // ─── Miembros: acciones ───────────────────────────────────────────────────
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

  async function transferOwnership(memberId: string, userId: string, displayName: string) {
    if (
      !confirm(
        `¿Transferir la propiedad de la sala a ${displayName}?\n\nVos pasarás a ser Admin. Esta acción no se puede deshacer desde la app.`
      )
    ) return;
    const res = await fetch(`/api/rooms/${room.id}/transfer-ownership`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ memberId }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      alert(`Error al transferir: ${data.error ?? "desconocido"}`);
      return;
    }
    setMembers((prev) =>
      prev.map((m) => {
        if (m.userId === userId) return { ...m, role: "OWNER" };
        if (m.userId === me.id) return { ...m, role: "ADMIN" };
        return m;
      })
    );
    setAmIOwner(false);
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

  // ─── Stats ────────────────────────────────────────────────────────────────
  const playerStats: PlayerStat[] = useMemo(
    () => computePlayerStats(members, allPredsByMatchUser, matches),
    [members, allPredsByMatchUser, matches]
  );

  // ─── Visibilidad ──────────────────────────────────────────────────────────
  const visibleMembers = membersOrdered.slice(0, MAX_VISIBLE_MEMBERS);
  const hasMoreMembers = membersOrdered.length > MAX_VISIBLE_MEMBERS;
  const visibleStandings = showAllStandings ? standings : standings.slice(0, MAX_VISIBLE_STANDINGS);
  const hasMoreStandings = standings.length > MAX_VISIBLE_STANDINGS;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cover bg-center" style={{ backgroundImage: "url('/img/LogoProde.webp')" }} />
        <div className="absolute inset-0 bg-slate-950/75" />
      </div>

      {/* Modales */}
      {showPendingModal && (
        <PendingModal
          pending={pendingMembers} roomId={room.id}
          onApproved={handleApproved} onRejected={handleRejected}
          onClose={() => setShowPendingModal(false)}
        />
      )}
      {showMembersModal && (
        <MembersModal
          members={membersOrdered} me={me} isOwner={amIOwner} canKick={canKick}
          onChangeRole={changeRole} onKick={kickMember} onTransfer={transferOwnership}
          onClose={() => setShowMembersModal(false)}
        />
      )}
      {showStatsModal && (
        <StatsModal stats={playerStats} me={me} onClose={() => setShowStatsModal(false)} />
      )}

      <section className="relative z-10">
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div className="mb-6 flex flex-col gap-4">
            <div className="flex flex-wrap items-start justify-between gap-4">

              {/* Info sala */}
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

              {/* Botones desktop */}
              <div className="hidden sm:flex flex-wrap items-center justify-end gap-2 shrink-0">
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
                {!amIOwner && (
                  <button onClick={leaveRoom}
                    className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20">
                    Salir de la sala
                  </button>
                )}
                {amIOwner && (
                  <button onClick={deleteRoom}
                    className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20">
                    Eliminar sala
                  </button>
                )}
              </div>
            </div>

            {/* Botones mobile */}
            <div className="flex sm:hidden flex-wrap gap-2">
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
                className="flex-1 rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition disabled:opacity-50">
                {saving ? "Guardando..." : "Guardar predicciones"}
              </button>
              {!amIOwner && (
                <button onClick={leaveRoom}
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20">
                  Salir
                </button>
              )}
              {amIOwner && (
                <button onClick={deleteRoom}
                  className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-2 text-sm font-semibold text-red-400 transition hover:bg-red-500/20">
                  Eliminar
                </button>
              )}
            </div>

            {/* Chips jugadores */}
            <div className="flex flex-wrap gap-1.5 text-xs">
              {visibleMembers.map((m) => {
                const isMe = m.userId === me.id;
                const isAdmin = m.role === "ADMIN" || m.role === "OWNER";
                const canRole = amIOwner && !isMe && m.role !== "OWNER";
                const showKick = canKick && !isMe && m.role !== "OWNER";
                const canTransfer = amIOwner && !isMe && m.role !== "OWNER";
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
                    {canTransfer && (
                      <button
                        onClick={() => transferOwnership(m.id, m.userId, m.displayName)}
                        className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-1.5 py-px text-[10px] text-yellow-400 hover:bg-yellow-500/20 transition ml-1"
                        title="Transferir ownership"
                      >
                        👑
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

          {/* Tabs de stage */}
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

          {/* ── Contenido principal ─────────────────────────────────────── */}
          <div className="grid gap-6 lg:grid-cols-[1fr_300px]">

            {/* Tablas de partidos */}
            <div className="space-y-4 min-w-0 overflow-hidden">
              {activeStage === "GROUP"
                ? groups.map(([g, list]) => (
                    <MatchTable
                      key={g}
                      list={list}
                      groupLabel={g}
                      membersOrdered={membersOrdered}
                      me={me}
                      room={room}
                      stageLocked={stageLocked}
                      draft={draft}
                      allPredsByMatchUser={allPredsByMatchUser}
                      matchColWidth={matchColWidth}
                      onScoreInput={handleScoreInput}
                      onPenSelect={handlePenSelect}
                    />
                  ))
                : (
                  <MatchTable
                    list={stageMatches}
                    membersOrdered={membersOrdered}
                    me={me}
                    room={room}
                    stageLocked={stageLocked}
                    draft={draft}
                    allPredsByMatchUser={allPredsByMatchUser}
                    matchColWidth={matchColWidth}
                    onScoreInput={handleScoreInput}
                    onPenSelect={handlePenSelect}
                  />
                )}
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

                const statsRows = [
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
                      {statsRows.map(({ label, icon, leader, value, color }) => (
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
                    <div className="px-5 py-3 border-t border-white/5 flex justify-end">
                      <button onClick={() => setShowStatsModal(true)} className="text-xs text-white/40 hover:text-white/70 transition">
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