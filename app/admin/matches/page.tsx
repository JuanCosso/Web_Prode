// app/admin/matches/page.tsx
"use client";

import { useEffect, useState } from "react";

type Match = {
  id: string;
  fifaId: string | null;
  stage: string;
  group: string | null;
  matchday: number;
  homeTeam: string;
  awayTeam: string;
  homeGoals: number | null;
  awayGoals: number | null;
  decidedByPenalties: boolean;
  penWinner: string | null;
  kickoffAt: string;
  city: string;
};

const STAGE_ORDER = ["PO_SF", "PO_F", "GROUP", "R32", "R16", "QF", "SF", "TPP", "FINAL"];
const STAGE_LABELS: Record<string, string> = {
  PO_SF: "Repechaje · Semis", PO_F: "Repechaje · Final",
  GROUP: "Fase de Grupos", R32: "16avos de Final", R16: "Octavos de Final",
  QF: "Cuartos de Final", SF: "Semifinales", TPP: "3° y 4° puesto", FINAL: "Final",
};

function fmtKickoff(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

function randomScore(): { h: number; a: number } {
  const weights = [0, 0, 0, 1, 1, 1, 1, 1, 2, 2, 2, 2, 2, 2, 3, 3, 3, 3, 4, 4, 5];
  return {
    h: weights[Math.floor(Math.random() * weights.length)],
    a: weights[Math.floor(Math.random() * weights.length)],
  };
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState("GROUP");

  const [editing, setEditing] = useState<Match | null>(null);
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");
  const [penalties, setPenalties] = useState(false);
  const [penWinner, setPenWinner] = useState("");
  const [newHomeTeam, setNewHomeTeam] = useState("");
  const [newAwayTeam, setNewAwayTeam] = useState("");
  const [newKickoffAt, setNewKickoffAt] = useState("");
  const [newCity, setNewCity] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [roomId, setRoomId] = useState("");
  const [fromDisplayName, setFromDisplayName] = useState("");
  const [toDisplayName, setToDisplayName] = useState("");
  const [overwriteExisting, setOverwriteExisting] = useState(false);
  const [transfering, setTransfering] = useState(false);
  const [transferMsg, setTransferMsg] = useState("");

  const [randomizing, setRandomizing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");
  const [initializingBracket, setInitializingBracket] = useState(false);
  const [bracketMsg, setBracketMsg] = useState("");
  
  const [showDebug, setShowDebug] = useState(false);
  const [debugData, setDebugData] = useState<any>(null);
  const [debugLoading, setDebugLoading] = useState(false);

  useEffect(() => {
    fetch("/api/admin/matches")
      .then((r) => r.json())
      .then((d) => { if (d.error) { setError(d.error); return; } setMatches(d.matches); })
      .catch(() => setError("Error cargando partidos"))
      .finally(() => setLoading(false));
  }, []);

  function openEdit(m: Match) {
    setEditing(m);
    setHomeGoals(m.homeGoals !== null ? String(m.homeGoals) : "");
    setAwayGoals(m.awayGoals !== null ? String(m.awayGoals) : "");
    setPenalties(m.decidedByPenalties);
    setPenWinner(m.penWinner ?? "");
    setNewHomeTeam(m.homeTeam);
    setNewAwayTeam(m.awayTeam);
    // Convertir ISO a formato datetime-local para el input
    const d = new Date(m.kickoffAt);
    const yyyy = d.getUTCFullYear();
    const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(d.getUTCDate()).padStart(2, "0");
    const hh = String(d.getUTCHours()).padStart(2, "0");
    const min = String(d.getUTCMinutes()).padStart(2, "0");
    setNewKickoffAt(`${yyyy}-${mm}-${dd}T${hh}:${min}`);
    setNewCity(m.city);
    setSaveMsg("");
  }

  // ── Guardar resultado individual ──────────────────────────────────────────
  async function saveResult() {
    if (!editing) return;
    setSaving(true); setSaveMsg("");

    const body: Record<string, unknown> = {
      homeTeam: newHomeTeam.trim() || undefined,
      awayTeam: newAwayTeam.trim() || undefined,
    };
    if (homeGoals !== "") body.homeGoals = parseInt(homeGoals, 10);
    if (awayGoals !== "") body.awayGoals = parseInt(awayGoals, 10);
    body.decidedByPenalties = penalties;
    body.penWinner = penalties ? penWinner.trim() : null;

    const res = await fetch(`/api/admin/matches/${editing.id}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();

    if (!res.ok) { setSaving(false); setSaveMsg(`❌ Error: ${data.error ?? "desconocido"}`); return; }

    // También guardar cambios de fecha/ciudad si se modificaron
    if (newKickoffAt || newCity !== editing.city) {
      const scheduleRes = await fetch("/api/admin/matches/update-schedule", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          matchId: editing.id,
          kickoffAt: newKickoffAt ? new Date(newKickoffAt).toISOString() : undefined,
          city: newCity !== editing.city ? newCity : undefined,
        }),
      });
      const scheduleData = await scheduleRes.json();
      if (scheduleRes.ok && scheduleData.match) {
        setMatches((prev) => prev.map((m) => m.id === scheduleData.match.id 
          ? { ...m, kickoffAt: scheduleData.match.kickoffAt, city: scheduleData.match.city } 
          : m
        ));
      }
    }

    setSaving(false);
    setSaveMsg("✅ Guardado");
    setMatches((prev) => prev.map((m) => m.id === data.match.id ? { ...m, ...data.match } : m));
    setEditing(null);
    setNewKickoffAt("");
    setNewCity("");
  }

  // ── Bulk: random de grupos ────────────────────────────────────────────────
  async function randomizeGroupResults() {
    const groupMatches = matches.filter((m) => m.stage === "GROUP");
    if (!confirm(`¿Cargar resultados random para ${groupMatches.length} partidos de fase de grupos?`)) return;

    setRandomizing(true); setBulkMsg("");

    const updates = groupMatches.map((m) => {
      const { h, a } = randomScore();
      return { id: m.id, homeGoals: h, awayGoals: a, decidedByPenalties: false, penWinner: null };
    });

    const res = await fetch("/api/admin/matches/bulk", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    const data = await res.json();
    setRandomizing(false);

    if (!res.ok) { setBulkMsg(`❌ Error: ${data.error ?? "desconocido"}`); return; }

    setMatches((prev) =>
      prev.map((m) => {
        const upd = data.matches?.find((u: Match) => u.id === m.id);
        return upd ? { ...m, ...upd } : m;
      })
    );
    setBulkMsg(`✅ ${data.updated}/${groupMatches.length} resultados cargados`);
  }

  // ── Bulk: limpiar todos ───────────────────────────────────────────────────
  async function clearAllResults() {
    const withResults = matches.filter((m) => m.homeGoals !== null || m.awayGoals !== null);
    if (withResults.length === 0) { setBulkMsg("ℹ️ No hay resultados para borrar."); return; }
    if (!confirm(`¿Borrar los resultados de ${withResults.length} partido(s)? Esta acción no se puede deshacer.`)) return;

    setClearing(true); setBulkMsg("");

    const updates = withResults.map((m) => ({
      id: m.id, homeGoals: null, awayGoals: null, decidedByPenalties: false, penWinner: null,
    }));

    const res = await fetch("/api/admin/matches/bulk", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ updates }),
    });
    const data = await res.json();
    setClearing(false);

    if (!res.ok) { setBulkMsg(`❌ Error: ${data.error ?? "desconocido"}`); return; }

    setMatches((prev) =>
      prev.map((m) => {
        const upd = data.matches?.find((u: Match) => u.id === m.id);
        return upd ? { ...m, ...upd } : m;
      })
    );
    setBulkMsg(`🗑️ ${data.updated}/${withResults.length} resultados eliminados`);
  }

  async function initializeKnockoutBracket() {
    if (!confirm("¿Crear la estructura de eliminatorias?")) return;
    setInitializingBracket(true);
    setBracketMsg("");

    const res = await fetch("/api/admin/knockout/init", { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setInitializingBracket(false);

    if (!res.ok) {
      setBracketMsg(`❌ Error: ${data.error ?? "desconocido"}`);
      return;
    }

    setBracketMsg(`✅ ${data.count ?? 0} partidos de eliminatorias creados`);
    window.location.reload();
  }

  async function loadDebugInfo() {
    setDebugLoading(true);
    const res = await fetch("/api/admin/bracket-debug");
    const data = await res.json().catch(() => null);
    setDebugData(data);
    setDebugLoading(false);
  }

  async function transferPredictions() {
    setTransferMsg("");
    setTransfering(true);

    const body = {
      roomId: roomId.trim(),
      fromDisplayName: fromDisplayName.trim(),
      toDisplayName: toDisplayName.trim(),
      overwriteExisting,
    };

    const res = await fetch("/api/admin/predictions/transfer", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json().catch(() => ({}));
    setTransfering(false);

    if (!res.ok) {
      setTransferMsg(`❌ Error: ${data.error ?? "desconocido"}`);
      return;
    }

    setTransferMsg(
      `✅ Transferidas ${data.moved} predicciones${data.overwritten ? `, sobrescritas ${data.overwritten}` : ""}${data.skipped ? `, omitidas ${data.skipped}` : ""}`
    );
    setRoomId("");
    setFromDisplayName("");
    setToDisplayName("");
    setOverwriteExisting(false);
  }

  const stagesPresent = STAGE_ORDER.filter((s) => matches.some((m) => m.stage === s));
  const filtered = matches
    .filter((m) => m.stage === selectedStage)
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

  const [activeStage, setActiveStage] = useState(() => stagesPresent.includes("R32") ? "R32" : stagesPresent[0] ?? "GROUP");

  if (loading) return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">Cargando...</div>
  );
  if (error) return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 text-lg">{error === "FORBIDDEN" ? "⛔ Acceso denegado" : `Error: ${error}`}</p>
        {error === "FORBIDDEN" && <p className="text-white/50 text-sm mt-2">Tu email no está en ADMIN_EMAILS</p>}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-5xl px-3 py-4 sm:px-4 sm:py-8">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
          <div className="min-w-0">
            <h1 className="text-xl font-bold sm:text-2xl">Admin — Resultados</h1>
            <p className="mt-1 text-sm text-white/50">Cargá los resultados reales de cada partido desde tu móvil sin girar la pantalla.</p>
          </div>
          <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
            <button
              onClick={randomizeGroupResults}
              disabled={randomizing || clearing}
              className="rounded-xl border border-white/20 bg-white/5 px-3 py-2 text-xs font-medium transition hover:bg-white/10 disabled:opacity-50"
            >
              {randomizing ? "Cargando..." : "🎲 Random (Grupos)"}
            </button>
            <button
              onClick={clearAllResults}
              disabled={randomizing || clearing}
              className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
            >
              {clearing ? "Borrando..." : "🗑️ Borrar resultados"}
            </button>
            <button
              onClick={() => { if (!showDebug) loadDebugInfo(); setShowDebug(!showDebug); }}
              className="rounded-xl border border-blue-500/30 bg-blue-500/10 px-3 py-2 text-xs font-medium text-blue-400 transition hover:bg-blue-500/20"
            >
              {showDebug ? "✕ Cerrar debug" : "🔍 Ver estructura KO"}
            </button>
          </div>
        </div>

        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold">Transferir predicciones entre cuentas</h2>
          <p className="mt-1 text-xs text-white/60">Pasa los pronósticos que hizo una cuenta antigua a la cuenta nueva dentro de la misma sala.</p>
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <input
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
              placeholder="ID de sala"
            />
            <input
              value={fromDisplayName}
              onChange={(e) => setFromDisplayName(e.target.value)}
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
              placeholder="Cuenta vieja (displayName)"
            />
            <input
              value={toDisplayName}
              onChange={(e) => setToDisplayName(e.target.value)}
              className="rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
              placeholder="Cuenta nueva (displayName)"
            />
            <label className="flex items-center gap-2 text-xs text-white/60">
              <input
                type="checkbox"
                checked={overwriteExisting}
                onChange={(e) => setOverwriteExisting(e.target.checked)}
                className="h-4 w-4 rounded border-white/20 bg-white/10 text-white focus:ring-white"
              />
              Sobrescribir predicciones existentes
            </label>
          </div>
          <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <button
              onClick={transferPredictions}
              disabled={transfering || randomizing || clearing}
              className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90 disabled:opacity-50"
            >
              {transfering ? "Transfiriendo..." : "Transferir predicciones"}
            </button>
            {transferMsg && <p className="text-xs text-white/70">{transferMsg}</p>}
          </div>
        </div>

        {bulkMsg && <p className="mb-4 mt-1 text-xs text-white/60">{bulkMsg}</p>}

        <div className="mb-4 rounded-2xl border border-white/10 bg-white/5 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-sm font-semibold">Estructura de eliminatorias</h2>
              <p className="mt-1 text-xs text-white/60">Crea los 16avos, octavos, cuartos, semifinales y final. Se rellenarán automáticamente conforme se resuelvan los partidos.</p>
            </div>
            <button
              onClick={initializeKnockoutBracket}
              disabled={initializingBracket}
              className="rounded-xl bg-white px-3 py-2 text-xs font-semibold text-slate-950 transition hover:bg-white/90 disabled:opacity-50"
            >
              {initializingBracket ? "Creando..." : "Crear eliminatorias"}
            </button>
          </div>
          {bracketMsg && <p className="mt-3 text-xs text-white/70">{bracketMsg}</p>}
        </div>

        {showDebug && (
          <div className="mb-4 rounded-2xl border border-blue-500/30 bg-blue-500/5 p-4">
            <h3 className="mb-3 text-sm font-semibold text-blue-300">📊 Debug: Estructura de Brackets</h3>
            {debugLoading ? (
              <p className="text-xs text-white/60">Cargando...</p>
            ) : debugData?.issues && debugData.issues.length > 0 ? (
              <div className="space-y-2">
                <p className="mb-3 text-xs text-orange-400">⚠️ Se detectaron {debugData.issues.length} problemas:</p>
                {debugData.issues.map((issue: any, i: number) => (
                  <div key={i} className="rounded-lg bg-white/5 p-2 text-[11px] text-white/70">
                    <span className="font-semibold text-orange-300">{issue.fifaId} ({issue.stage})</span>: {issue.problem}
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-green-400">✅ No hay problemas detectados</p>
            )}
            {debugData?.stats && (
              <div className="mt-3 grid gap-2 grid-cols-2 sm:grid-cols-3 md:grid-cols-6">
                {debugData.stats.map((s: any) => (
                  <div key={s.stage} className="rounded-lg bg-white/10 p-2 text-center">
                    <div className="text-[11px] font-semibold text-white/50">{STAGE_LABELS[s.stage] ?? s.stage}</div>
                    <div className="mt-1 text-sm font-bold text-white">{s.played}/{s.total}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="mb-5 flex flex-wrap gap-2">
          {stagesPresent.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStage(s)}
              className={[
                "rounded-xl px-3 py-1.5 text-xs font-medium transition",
                selectedStage === s ? "bg-white text-slate-950" : "border border-white/20 text-white/70 hover:bg-white/10",
              ].join(" ")}
            >
              {STAGE_LABELS[s] ?? s}
            </button>
          ))}
        </div>

        <div className="space-y-3 sm:hidden">
          {filtered.map((m) => {
            const hasResult = m.homeGoals !== null && m.awayGoals !== null;
            return (
              <div key={m.id} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="text-sm font-semibold leading-tight">{m.homeTeam} vs {m.awayTeam}</div>
                    <div className="mt-1 text-[11px] text-white/40">{m.fifaId} · {m.city}</div>
                    <div className="mt-2 text-[11px] text-white/50">{fmtKickoff(m.kickoffAt)}</div>
                  </div>
                  <button
                    onClick={() => openEdit(m)}
                    className="shrink-0 rounded-lg border border-white/20 px-3 py-1.5 text-xs font-medium hover:bg-white/10"
                  >
                    {hasResult ? "Editar" : "Cargar"}
                  </button>
                </div>
                <div className="mt-3 flex items-center justify-between text-xs">
                  <span className="text-white/55">Resultado</span>
                  {hasResult ? (
                    <span className="font-semibold text-emerald-400">{m.homeGoals} – {m.awayGoals}</span>
                  ) : (
                    <span className="text-white/30">Sin cargar</span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between text-xs">
                  <span className="text-white/55">Penales</span>
                  {m.decidedByPenalties ? (
                    <span className="text-amber-400">🏆 {m.penWinner}</span>
                  ) : (
                    <span className="text-white/20">—</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="hidden overflow-hidden rounded-2xl border border-white/10 sm:block">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-xs uppercase text-white/60">
              <tr>
                <th className="px-4 py-3 text-left">Partido</th>
                <th className="px-4 py-3 text-center">Resultado</th>
                <th className="px-4 py-3 text-center">Penales</th>
                <th className="px-4 py-3 text-center">Kickoff (AR)</th>
                <th className="px-4 py-3 text-center">Acción</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((m) => {
                const hasResult = m.homeGoals !== null && m.awayGoals !== null;
                return (
                  <tr key={m.id} className="border-t border-white/8 transition hover:bg-white/4">
                    <td className="px-4 py-3">
                      <div className="font-medium">{m.homeTeam} vs {m.awayTeam}</div>
                      <div className="text-xs text-white/40">{m.fifaId} · {m.city}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasResult ? (
                        <span className="font-bold text-green-400">{m.homeGoals} – {m.awayGoals}</span>
                      ) : (
                        <span className="text-white/30">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {m.decidedByPenalties ? (
                        <span className="text-yellow-400">🏆 {m.penWinner}</span>
                      ) : (
                        <span className="text-white/20">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-white/50">{fmtKickoff(m.kickoffAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEdit(m)}
                        className="rounded-lg border border-white/20 px-3 py-1 text-xs transition hover:bg-white/10"
                      >
                        {hasResult ? "Editar" : "Cargar"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Modal de edición */}
        {editing && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditing(null)} />
            <div className="relative w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-4 shadow-2xl sm:p-6">
              <h2 className="mb-1 text-lg font-semibold">{editing.homeTeam} vs {editing.awayTeam}</h2>
              <p className="mb-4 text-xs text-white/40">{editing.fifaId} · {editing.city}</p>

              <div className="mb-4">
                <label className="mb-2 block text-xs text-white/60">Fecha y hora (UTC)</label>
                <input
                  type="datetime-local"
                  value={newKickoffAt}
                  onChange={(e) => setNewKickoffAt(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-xs text-white/60">Ciudad (opcional)</label>
                <input
                  value={newCity}
                  onChange={(e) => setNewCity(e.target.value)}
                  className="w-full rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
                  placeholder="Ciudad del partido"
                />
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-xs text-white/60">Equipos (opcional)</label>
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input
                    value={newHomeTeam}
                    onChange={(e) => setNewHomeTeam(e.target.value)}
                    className="flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
                    placeholder="Local"
                  />
                  <input
                    value={newAwayTeam}
                    onChange={(e) => setNewAwayTeam(e.target.value)}
                    className="flex-1 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-sm outline-none focus:border-white/30"
                    placeholder="Visitante"
                  />
                </div>
              </div>

              <div className="mb-4">
                <label className="mb-2 block text-xs text-white/60">Resultado</label>
                <div className="flex items-center justify-center gap-3 sm:justify-start">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={homeGoals}
                    onChange={(e) => setHomeGoals(e.target.value)}
                    className="w-20 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-center text-sm outline-none focus:border-white/30"
                    placeholder="0"
                  />
                  <span className="text-sm font-bold text-white/40">–</span>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={awayGoals}
                    onChange={(e) => setAwayGoals(e.target.value)}
                    className="w-20 rounded-lg border border-white/15 bg-white/10 px-3 py-2 text-center text-sm outline-none focus:border-white/30"
                    placeholder="0"
                  />
                </div>
              </div>

              <div className="mb-5">
                <label className="flex cursor-pointer items-center gap-2 text-sm">
                  <input type="checkbox" checked={penalties} onChange={(e) => setPenalties(e.target.checked)} className="rounded" />
                  Definido por penales
                </label>
                {penalties && (
                  <div className="mt-3">
                    <label className="mb-1 block text-xs text-white/60">Ganador en penales</label>
                    <div className="flex flex-col gap-2 sm:flex-row">
                      {[editing.homeTeam, editing.awayTeam].map((t) => (
                        <button
                          key={t}
                          onClick={() => setPenWinner(t)}
                          className={[
                            "flex-1 rounded-lg px-3 py-2 text-sm transition",
                            penWinner === t ? "bg-white text-slate-950 font-semibold" : "border border-white/15 bg-white/10 hover:bg-white/20",
                          ].join(" ")}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {saveMsg && <p className="mb-4 text-sm text-white/70">{saveMsg}</p>}

              <div className="flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <button onClick={() => { setEditing(null); setNewKickoffAt(""); setNewCity(""); }} className="rounded-xl border border-white/20 px-4 py-2 text-sm transition hover:bg-white/10">
                  Cancelar
                </button>
                <button onClick={saveResult} disabled={saving} className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:bg-white/90 disabled:opacity-50">
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}