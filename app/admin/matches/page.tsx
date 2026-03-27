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
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  const [randomizing, setRandomizing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");

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
    setSaving(false);

    if (!res.ok) { setSaveMsg(`❌ Error: ${data.error ?? "desconocido"}`); return; }
    setSaveMsg("✅ Guardado");
    setMatches((prev) => prev.map((m) => m.id === data.match.id ? { ...m, ...data.match } : m));
    setEditing(null);
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

  const stagesPresent = STAGE_ORDER.filter((s) => matches.some((m) => m.stage === s));
  const filtered = matches
    .filter((m) => m.stage === selectedStage)
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

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
      <div className="max-w-5xl mx-auto px-4 py-8">

        <div className="flex items-start justify-between gap-4 mb-1 flex-wrap">
          <h1 className="text-2xl font-bold">Admin — Resultados</h1>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={randomizeGroupResults}
              disabled={randomizing || clearing}
              className="rounded-xl border border-white/20 bg-white/5 px-4 py-2 text-xs font-medium hover:bg-white/10 transition disabled:opacity-50"
            >
              {randomizing ? "Cargando..." : "🎲 Random (Grupos)"}
            </button>
            <button
              onClick={clearAllResults}
              disabled={randomizing || clearing}
              className="rounded-xl border border-red-500/30 bg-red-500/10 text-red-400 px-4 py-2 text-xs font-medium hover:bg-red-500/20 transition disabled:opacity-50"
            >
              {clearing ? "Borrando..." : "🗑️ Borrar todos los resultados"}
            </button>
          </div>
        </div>

        {bulkMsg && <p className="text-xs text-white/60 mb-4 mt-1">{bulkMsg}</p>}

        <p className="text-white/50 text-sm mb-6">Cargá los resultados reales de cada partido.</p>

        {/* Tabs de stage */}
        <div className="flex flex-wrap gap-2 mb-6">
          {stagesPresent.map((s) => (
            <button key={s} onClick={() => setSelectedStage(s)}
              className={["rounded-xl px-3 py-1.5 text-xs font-medium transition",
                selectedStage === s ? "bg-white text-slate-950" : "border border-white/20 text-white/70 hover:bg-white/10"
              ].join(" ")}>
              {STAGE_LABELS[s] ?? s}
            </button>
          ))}
        </div>

        {/* Tabla de partidos */}
        <div className="rounded-2xl border border-white/10 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-white/5 text-white/60 text-xs uppercase">
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
                  <tr key={m.id} className="border-t border-white/8 hover:bg-white/4 transition">
                    <td className="px-4 py-3">
                      <div className="font-medium">{m.homeTeam} vs {m.awayTeam}</div>
                      <div className="text-xs text-white/40">{m.fifaId} · {m.city}</div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      {hasResult
                        ? <span className="font-bold text-green-400">{m.homeGoals} – {m.awayGoals}</span>
                        : <span className="text-white/30">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs">
                      {m.decidedByPenalties
                        ? <span className="text-yellow-400">🏆 {m.penWinner}</span>
                        : <span className="text-white/20">—</span>}
                    </td>
                    <td className="px-4 py-3 text-center text-xs text-white/50">{fmtKickoff(m.kickoffAt)}</td>
                    <td className="px-4 py-3 text-center">
                      <button onClick={() => openEdit(m)}
                        className="rounded-lg border border-white/20 px-3 py-1 text-xs hover:bg-white/10 transition">
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setEditing(null)} />
            <div className="relative bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="font-semibold text-lg mb-1">{editing.homeTeam} vs {editing.awayTeam}</h2>
              <p className="text-xs text-white/40 mb-5">{editing.fifaId} · {editing.city}</p>

              {/* Equipos */}
              <div className="mb-4">
                <label className="block text-xs text-white/60 mb-2">Equipos (opcional)</label>
                <div className="flex gap-2">
                  <input value={newHomeTeam} onChange={(e) => setNewHomeTeam(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/30"
                    placeholder="Local" />
                  <input value={newAwayTeam} onChange={(e) => setNewAwayTeam(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/30"
                    placeholder="Visitante" />
                </div>
              </div>

              {/* Resultado */}
              <div className="mb-4">
                <label className="block text-xs text-white/60 mb-2">Resultado</label>
                <div className="flex items-center gap-3">
                  <input type="number" min={0} max={30} value={homeGoals}
                    onChange={(e) => setHomeGoals(e.target.value)}
                    className="w-20 bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm text-center outline-none focus:border-white/30"
                    placeholder="0" />
                  <span className="text-white/40 font-bold">–</span>
                  <input type="number" min={0} max={30} value={awayGoals}
                    onChange={(e) => setAwayGoals(e.target.value)}
                    className="w-20 bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm text-center outline-none focus:border-white/30"
                    placeholder="0" />
                </div>
              </div>

              {/* Penales */}
              <div className="mb-6">
                <label className="flex items-center gap-2 text-sm cursor-pointer">
                  <input type="checkbox" checked={penalties} onChange={(e) => setPenalties(e.target.checked)}
                    className="rounded" />
                  Definido por penales
                </label>
                {penalties && (
                  <div className="mt-3">
                    <label className="block text-xs text-white/60 mb-1">Ganador en penales</label>
                    <div className="flex gap-2">
                      {[editing.homeTeam, editing.awayTeam].map((t) => (
                        <button key={t} onClick={() => setPenWinner(t)}
                          className={["flex-1 rounded-lg px-3 py-2 text-sm transition",
                            penWinner === t ? "bg-white text-slate-950 font-semibold" : "bg-white/10 border border-white/15 hover:bg-white/20"
                          ].join(" ")}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {saveMsg && <p className="text-sm mb-4 text-white/70">{saveMsg}</p>}

              <div className="flex items-center justify-end gap-3">
                <button onClick={() => setEditing(null)}
                  className="rounded-xl border border-white/20 px-4 py-2 text-sm hover:bg-white/10 transition">
                  Cancelar
                </button>
                <button onClick={saveResult} disabled={saving}
                  className="rounded-xl bg-white text-slate-950 px-4 py-2 text-sm font-semibold hover:bg-white/90 disabled:opacity-50 transition">
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