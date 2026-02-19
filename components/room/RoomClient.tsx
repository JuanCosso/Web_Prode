"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type Room = { id: string; name: string; code: string; editPolicy: string; accessType: "OPEN" | "CLOSED" };
type Me = { id: string; displayName: string };
type MemberRole = "OWNER" | "ADMIN" | "MEMBER";
type Member = { id: string; userId: string; displayName: string; contributionText: string; role: MemberRole };
type PendingMember = { id: string; displayName: string };
type Match = { id: string; stage: string; group: string | null; matchday: number | null; kickoffAt: string | Date; kickoffLabel: string; homeTeam: string; awayTeam: string };
type MyPred = { matchId: string; predHomeGoals: number; predAwayGoals: number; predPenWinner: string | null };
type StandingRow = { userId: string; displayName: string; points: number; exactHits: number; outcomeHits: number; contributionText?: string | null };
type LivePred = { matchId: string; userId: string; displayName: string; h: number; a: number };

function modeLabel(p: string) { return p === "ALLOW_UNTIL_ROUND_CLOSE" ? "Desafío" : "Mundial"; }

function Flag({ code, alt }: { code?: string; alt: string }) {
  const c = (code || "").toLowerCase().trim();
  if (!c) return null;
  return <img src={`https://flagcdn.com/h24/${c}.png`} srcSet={`https://flagcdn.com/h48/${c}.png 2x`} height={24} width={36} className="h-4 w-6 rounded-[3px] border border-white/10 object-cover shrink-0" alt={alt} loading="lazy" />;
}

function normTeam(s: string) { return (s || "").toLowerCase().normalize("NFD").replace(/\p{Diacritic}/gu, "").replace(/\s+/g, " ").trim(); }
const FLAGS: Record<string, string> = { argentina:"ar",brasil:"br",brazil:"br",uruguay:"uy",paraguay:"py",chile:"cl",colombia:"co",ecuador:"ec",peru:"pe",venezuela:"ve",bolivia:"bo",mexico:"mx","méxico":"mx",canada:"ca","canadá":"ca","estados unidos":"us",usa:"us","united states":"us",alemania:"de",germany:"de",francia:"fr",france:"fr",espana:"es","españa":"es",spain:"es",italia:"it",italy:"it",portugal:"pt","paises bajos":"nl","países bajos":"nl",netherlands:"nl",holanda:"nl",belgica:"be","bélgica":"be",belgium:"be",suiza:"ch",switzerland:"ch",sudafrica:"za","sudáfrica":"za","south africa":"za",japon:"jp","japón":"jp",japan:"jp","corea del sur":"kr","south korea":"kr",qatar:"qa",marruecos:"ma",morocco:"ma",haiti:"ht",escocia:"gb-sct",australia:"au",curazao:"cw","costa de marfil":"ci",tunez:"tn",iran:"ir",egipto:"eg","nueva zelanda":"nz","cabo verde":"cv","arabia saudita":"sa",senegal:"sn",noruega:"no",austria:"at",jordania:"jo",argelia:"dz",uzbekistan:"uz",inglaterra:"gb-eng",croacia:"hr",ghana:"gh",panama:"pa" };
function flagCodeFor(t: string) { return FLAGS[normTeam(t)] || ""; }

// ─── Modal de solicitudes ────────────────────────────────────────────────────
// ✅ Sin useState propio para la lista — lee directo de `pending` (estado del padre)
function PendingModal({
  roomId,
  pending,       // ← prop del padre, se actualiza en tiempo real
  onClose,
  onApproved,
  onRejected,
}: {
  roomId: string;
  pending: PendingMember[];
  onClose: () => void;
  onApproved: (member: Member) => void;
  onRejected: (memberId: string) => void;
}) {
  const [search, setSearch] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const overlayRef = useRef<HTMLDivElement>(null);

  // Cuando no quedan pendientes, cerrar el modal automáticamente
  useEffect(() => {
    if (pending.length === 0 && search === "") {
      // pequeño delay para que el usuario vea "No hay solicitudes" antes de cerrar
      const t = setTimeout(onClose, 800);
      return () => clearTimeout(t);
    }
  }, [pending.length, search, onClose]);

  const filtered = search
    ? pending.filter((p) => p.displayName.toLowerCase().includes(search.toLowerCase()))
    : pending;

  async function approve(memberId: string) {
    setBusy(memberId);
    const res = await fetch(`/api/rooms/${roomId}/members/${memberId}/approve`, { method: "PATCH" });
    const data = await res.json().catch(() => ({}));
    setBusy(null);
    if (res.ok && data.member) {
      onApproved(data.member); // padre actualiza pendingMembers, members y standings
    }
  }

  async function reject(memberId: string) {
    setBusy(memberId);
    const res = await fetch(`/api/rooms/${roomId}/members/${memberId}/reject`, { method: "DELETE" });
    setBusy(null);
    if (res.ok) {
      onRejected(memberId); // padre actualiza pendingMembers → modal se re-renderiza con lista actualizada
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-2">
            <h2 className="font-semibold text-white">Solicitudes pendientes</h2>
            <span className="text-xs text-white/50">({pending.length})</span>
          </div>
          <button onClick={onClose} className="text-white/50 hover:text-white transition text-lg leading-none">✕</button>
        </div>

        <div className="px-5 py-3 border-b border-white/10">
          <input
            type="text"
            placeholder="Buscar por nombre…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-xl bg-white/10 border border-white/15 px-3 py-2 text-sm text-white placeholder-white/40 outline-none focus:border-white/30"
          />
        </div>

        <div className="max-h-80 overflow-y-auto divide-y divide-white/5">
          {filtered.length === 0 ? (
            <div className="px-5 py-8 text-sm text-white/50 text-center">
              {search ? "Sin resultados para esa búsqueda" : "✅ No hay solicitudes pendientes"}
            </div>
          ) : (
            filtered.map((p) => (
              <div key={p.id} className="flex items-center justify-between px-5 py-3 gap-3">
                <span className="text-sm text-white font-medium truncate">{p.displayName}</span>
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => approve(p.id)}
                    disabled={busy === p.id}
                    className="rounded-lg bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50 transition"
                  >
                    {busy === p.id ? "…" : "Aceptar"}
                  </button>
                  <button
                    onClick={() => reject(p.id)}
                    disabled={busy === p.id}
                    className="rounded-lg bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold text-white/80 hover:bg-red-600 hover:border-red-600 hover:text-white disabled:opacity-50 transition"
                  >
                    {busy === p.id ? "…" : "Rechazar"}
                  </button>
                </div>
              </div>
            ))
          )}
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

  // ── Estado único y centralizado ──────────────────────────────────────────
  const [members, setMembers] = useState(initialMembers);
  const [standings, setStandings] = useState(initialStandings);
  const [pendingMembers, setPendingMembers] = useState<PendingMember[]>(initialPending);
  const [showPendingModal, setShowPendingModal] = useState(false);

  // Aceptar → quitar de pending, sumar a members y standings
  function handleApproved(newMember: Member) {
    setPendingMembers((prev) => prev.filter((p) => p.id !== newMember.id));
    setMembers((prev) => prev.some((m) => m.id === newMember.id) ? prev : [...prev, newMember]);
    setStandings((prev) => prev.some((s) => s.userId === newMember.userId) ? prev : [
      ...prev,
      { userId: newMember.userId, displayName: newMember.displayName, points: 0, exactHits: 0, outcomeHits: 0, contributionText: newMember.contributionText },
    ]);
  }

  // Rechazar → solo quitar de pending
  function handleRejected(memberId: string) {
    setPendingMembers((prev) => prev.filter((p) => p.id !== memberId));
  }

  // Expulsar miembro activo
  async function kickMember(memberId: string, userId: string, displayName: string) {
    if (!confirm(`¿Expulsar a "${displayName}"?\n\nVa a perder todos sus puntos y predicciones. Esta acción no se puede deshacer.`)) return;
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

  const groups = useMemo(() => {
    const map = new Map<string, Match[]>();
    for (const m of matches) {
      const g = m.group ? String(m.group).toUpperCase() : "—";
      if (!map.has(g)) map.set(g, []);
      map.get(g)!.push(m);
    }
    return Array.from(map.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [matches]);

  const myRole: MemberRole = members.find((m) => m.userId === me.id)?.role ?? "MEMBER";
  const membersOrdered = useMemo(() => {
    const rest = members.filter((m) => m.userId !== me.id);
    return [{ id: "ME", userId: me.id, displayName: me.displayName, contributionText: "", role: myRole } as Member, ...rest];
  }, [members, me.id, me.displayName, myRole]);

  const [draft, setDraft] = useState(() => {
    const by = new Map<string, MyPred>();
    for (const p of myPreds) by.set(p.matchId, p);
    const init: Record<string, { h: string; a: string }> = {};
    for (const m of matches) { const p = by.get(m.id); init[m.id] = { h: p ? String(p.predHomeGoals) : "", a: p ? String(p.predAwayGoals) : "" }; }
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
    const entries = Object.entries(draft).flatMap(([matchId, { h, a }]) => {
      const hN = parseInt(h, 10); const aN = parseInt(a, 10);
      if (isNaN(hN) || isNaN(aN)) return [];
      return [{ matchId, predHomeGoals: hN, predAwayGoals: aN }];
    });
    const res = await fetch(`/api/rooms/${room.id}/predictions`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ predictions: entries }) });
    setSaving(false); setMsg(res.ok ? "Guardado ✅" : "Error al guardar.");
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cover bg-center scale-105" style={{ backgroundImage: "url('/img/wallpaper.webp')" }} />
        <div className="absolute inset-0 backdrop-blur-lg bg-slate-950/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/65" />
      </div>

      {/* ✅ Modal siempre recibe pendingMembers fresco del estado del padre */}
      {showPendingModal && (
        <PendingModal
          roomId={room.id}
          pending={pendingMembers}
          onClose={() => setShowPendingModal(false)}
          onApproved={handleApproved}
          onRejected={handleRejected}
        />
      )}

      <header className="relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-wide">Prode Mundial 2026</Link>
          <Link href="/profile" className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium backdrop-blur transition hover:border-white/30 hover:bg-white/15">{me.displayName}</Link>
        </div>
      </header>

      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          <div className="rounded-3xl border border-white/12 bg-white/8 p-5 backdrop-blur sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold">{room.name}</h1>
                <div className="mt-1 text-sm text-white/70">
                  Código: <span className="font-mono text-white">{room.code}</span>
                  <span className="text-white/40"> · </span>
                  Modo: <span className="text-white">{modeLabel(room.editPolicy)}</span>
                  <span className="text-white/40"> · </span>
                  Acceso: <span className={room.accessType === "CLOSED" ? "text-yellow-400" : "text-emerald-400"}>{room.accessType === "CLOSED" ? "Cerrada 🔒" : "Abierta 🔓"}</span>
                  <span className="text-white/40"> · </span>
                  Jugados: <span className="text-white">{playedCount}</span>/{matches.length}
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {(canKick || canModerate) && room.accessType === "CLOSED" && (
                  <button
                    onClick={() => setShowPendingModal(true)}
                    className="relative rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:bg-white/15"
                  >
                    Solicitudes
                    {pendingMembers.length > 0 && (
                      <span className="ml-1.5 inline-flex items-center justify-center rounded-full bg-yellow-400 text-slate-900 text-[11px] font-bold w-5 h-5">
                        {pendingMembers.length}
                      </span>
                    )}
                  </button>
                )}
                <button onClick={saveAll} disabled={saving} className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
                {isOwner && (
                  <button onClick={deleteRoom} className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700">
                    Eliminar sala
                  </button>
                )}
                <Link href="/" className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:border-white/30 hover:bg-white/15">Volver</Link>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="text-xs font-semibold text-white/70 uppercase tracking-wider">Participantes</div>
              <div className="mt-2 flex flex-wrap gap-2">
                {members.map((m) => {
                  const isMe = m.userId === me.id;
                  const isOwnerRole = m.role === "OWNER";
                  const isAdminRole = m.role === "ADMIN";
                  const showKick = canKick && !isMe && !isOwnerRole;
                  const canChangeRole = isOwner && !isMe && !isOwnerRole;
                  return (
                    <span key={m.id} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs" title={m.contributionText || "sin aporte"}>
                      <span className="text-white font-medium">{m.displayName}</span>
                      {(isOwnerRole || isAdminRole) && (
                        <span className="rounded-full border border-white/15 bg-white/10 px-2 py-[2px] text-[10px] text-white/80">{isOwnerRole ? "👑 Owner" : "⭐ Admin"}</span>
                      )}
                      <span className="text-white/50">— {m.contributionText || "sin aporte"}</span>
                      {canChangeRole && (
                        <button onClick={() => changeRole(m.id, isAdminRole ? "MEMBER" : "ADMIN")}
                          className="rounded-full border border-white/20 bg-white/10 px-2 py-[2px] text-[10px] text-white/70 hover:bg-white/20 hover:text-white transition">
                          {isAdminRole ? "−Admin" : "+Admin"}
                        </button>
                      )}
                      {showKick && (
                        <button onClick={() => kickMember(m.id, m.userId, m.displayName)}
                          className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-[2px] text-[10px] text-red-400 hover:bg-red-500/20 hover:text-red-300 transition">
                          Expulsar
                        </button>
                      )}
                    </span>
                  );
                })}
              </div>
            </div>
            {msg && <div className="mt-3 text-sm text-white/80">{msg}</div>}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            <div className="space-y-4">
              {groups.map(([g, list]) => (
                <div key={g} className="rounded-3xl border border-white/12 bg-white/8 backdrop-blur overflow-hidden">
                  <div className="flex items-center justify-between px-5 py-4 border-b border-white/5">
                    <div className="text-sm font-semibold">Grupo {g}</div>
                    <div className="text-xs text-white/60">{list.length} partidos</div>
                  </div>
                  <div className="px-4 pb-4">
                    <div className="overflow-x-auto">
                      <table className="min-w-[780px] w-full text-xs">
                        <thead className="bg-white/5">
                          <tr>
                            <th className="px-3 py-2 text-left w-[320px]">Partido</th>
                            {membersOrdered.map((mb) => (
                              <th key={mb.userId} className={["px-2 py-2 text-center whitespace-nowrap", mb.userId === me.id ? "text-white" : "text-white/80"].join(" ")}>{mb.displayName}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {list.map((m) => {
                            const kickoff = new Date(m.kickoffAt);
                            const lockedLocal = room.editPolicy !== "ALLOW_UNTIL_ROUND_CLOSE" ? Date.now() >= kickoff.getTime() : false;
                            return (
                              <tr key={m.id} className="border-t border-white/10">
                                <td className="px-3 py-3">
                                  <div className="text-[11px] text-white/60 mb-1">{(m as any).kickoffLabel}</div>
                                  <div className="flex items-center gap-2">
                                    <Flag code={flagCodeFor(m.homeTeam)} alt={m.homeTeam} />
                                    <span className="font-medium truncate">{m.homeTeam}</span>
                                    <span className="text-white/40">vs</span>
                                    <span className="font-medium truncate">{m.awayTeam}</span>
                                    <Flag code={flagCodeFor(m.awayTeam)} alt={m.awayTeam} />
                                  </div>
                                </td>
                                {membersOrdered.map((mb) => {
                                  const isMeCol = mb.userId === me.id;
                                  const p = liveByMatchUser.get(`${m.id}__${mb.userId}`);
                                  return (
                                    <td key={mb.userId} className="px-2 py-2">
                                      {isMeCol ? (
                                        <div className="flex items-center justify-center gap-1">
                                          <input value={draft[m.id]?.h ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [m.id]: { ...(d[m.id] ?? { h: "", a: "" }), h: e.target.value } }))} disabled={lockedLocal} className="w-10 rounded-lg bg-white/10 border border-white/20 px-1 py-1 text-center text-xs text-white outline-none focus:border-white/40 disabled:opacity-40" maxLength={2} />
                                          <span className="text-white/40">-</span>
                                          <input value={draft[m.id]?.a ?? ""} onChange={(e) => setDraft((d) => ({ ...d, [m.id]: { ...(d[m.id] ?? { h: "", a: "" }), a: e.target.value } }))} disabled={lockedLocal} className="w-10 rounded-lg bg-white/10 border border-white/20 px-1 py-1 text-center text-xs text-white outline-none focus:border-white/40 disabled:opacity-40" maxLength={2} />
                                        </div>
                                      ) : (
                                        <div className="text-center text-white/60">{p ? `${p.h} - ${p.a}` : "—"}</div>
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
              ))}
            </div>

            <div className="space-y-4">
              <div className="rounded-3xl border border-white/12 bg-white/8 backdrop-blur overflow-hidden">
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
                        <th className="px-2 py-2 text-center">Exactos</th>
                        <th className="px-2 py-2 text-center">1X2</th>
                      </tr>
                    </thead>
                    <tbody>
                      {standings.map((s, i) => (
                        <tr key={s.userId} className={["border-t border-white/10", s.userId === me.id ? "bg-white/5" : ""].join(" ")}>
                          <td className="px-2 py-2 text-white/50">{i + 1}</td>
                          <td className="px-2 py-2 font-medium truncate max-w-[120px]">{s.displayName}</td>
                          <td className="px-2 py-2 text-center font-bold text-white">{s.points}</td>
                          <td className="px-2 py-2 text-center text-white/70">{s.exactHits}</td>
                          <td className="px-2 py-2 text-center text-white/70">{s.outcomeHits}</td>
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