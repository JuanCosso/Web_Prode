// app/admin/matches/page.tsx
// Página de administración para cargar resultados manualmente.
// Solo accesible si el email del usuario está en ADMIN_EMAILS.

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

const STAGE_ORDER = ["GROUP", "R32", "R16", "QF", "SF", "TPP", "FINAL"];
const STAGE_LABELS: Record<string, string> = {
  GROUP: "Fase de Grupos",
  R32: "16avos de Final",
  R16: "Octavos de Final",
  QF: "Cuartos de Final",
  SF: "Semifinales",
  TPP: "3° y 4° puesto",
  FINAL: "Final",
};

function fmtKickoff(iso: string) {
  return new Date(iso).toLocaleString("es-AR", {
    day: "2-digit", month: "2-digit",
    hour: "2-digit", minute: "2-digit",
    timeZone: "America/Argentina/Buenos_Aires",
  });
}

export default function AdminMatchesPage() {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedStage, setSelectedStage] = useState("GROUP");

  // Estado del formulario de edición
  const [editing, setEditing] = useState<Match | null>(null);
  const [homeGoals, setHomeGoals] = useState("");
  const [awayGoals, setAwayGoals] = useState("");
  const [penalties, setPenalties] = useState(false);
  const [penWinner, setPenWinner] = useState("");
  const [newHomeTeam, setNewHomeTeam] = useState("");
  const [newAwayTeam, setNewAwayTeam] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState("");

  useEffect(() => {
    fetch("/api/admin/matches")
      .then((r) => r.json())
      .then((d) => {
        if (d.error) { setError(d.error); return; }
        setMatches(d.matches);
      })
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

  async function saveResult() {
    if (!editing) return;
    setSaving(true);
    setSaveMsg("");

    const body: Record<string, unknown> = {
      homeTeam: newHomeTeam.trim() || undefined,
      awayTeam: newAwayTeam.trim() || undefined,
    };

    if (homeGoals !== "") body.homeGoals = parseInt(homeGoals, 10);
    if (awayGoals !== "") body.awayGoals = parseInt(awayGoals, 10);
    body.decidedByPenalties = penalties;
    body.penWinner = penalties ? penWinner.trim() : null;

    const res = await fetch(`/api/admin/matches/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const data = await res.json();
    setSaving(false);

    if (!res.ok) {
      setSaveMsg(`❌ Error: ${data.error ?? "desconocido"}`);
      return;
    }

    setSaveMsg("✅ Guardado");
    // Actualizar lista local
    setMatches((prev) =>
      prev.map((m) => m.id === data.match.id ? { ...m, ...data.match } : m)
    );
    setEditing(null);
  }

  const stagesPresent = STAGE_ORDER.filter((s) =>
    matches.some((m) => m.stage === s)
  );

  const filtered = matches
    .filter((m) => m.stage === selectedStage)
    .sort((a, b) => new Date(a.kickoffAt).getTime() - new Date(b.kickoffAt).getTime());

  if (loading) return (
    <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
      Cargando...
    </div>
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
        <h1 className="text-2xl font-bold mb-1">Admin — Resultados</h1>
        <p className="text-white/50 text-sm mb-6">
          Cargá los resultados reales de cada partido.
        </p>

        {/* Tabs de stage */}
        <div className="flex flex-wrap gap-2 mb-6">
          {stagesPresent.map((s) => (
            <button
              key={s}
              onClick={() => setSelectedStage(s)}
              className={[
                "rounded-xl px-3 py-1.5 text-xs font-medium transition",
                selectedStage === s
                  ? "bg-white text-slate-950"
                  : "border border-white/20 text-white/70 hover:bg-white/10",
              ].join(" ")}
            >
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
                      {hasResult ? (
                        <span className="font-bold text-green-400">
                          {m.homeGoals} – {m.awayGoals}
                        </span>
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
                    <td className="px-4 py-3 text-center text-xs text-white/50">
                      {fmtKickoff(m.kickoffAt)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <button
                        onClick={() => openEdit(m)}
                        className="rounded-lg border border-white/20 px-3 py-1 text-xs hover:bg-white/10 transition"
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
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setEditing(null)}
            />
            <div className="relative bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-md shadow-2xl">
              <h2 className="font-semibold text-lg mb-1">
                {editing.homeTeam} vs {editing.awayTeam}
              </h2>
              <p className="text-xs text-white/40 mb-5">{editing.fifaId} · {editing.city}</p>

              {/* Equipos (para KO, cuando se conocen los clasificados) */}
              <div className="mb-4">
                <label className="block text-xs text-white/60 mb-2">Equipos (opcional, para actualizar placeholders)</label>
                <div className="flex gap-2">
                  <input
                    value={newHomeTeam}
                    onChange={(e) => setNewHomeTeam(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/30"
                    placeholder="Local"
                  />
                  <input
                    value={newAwayTeam}
                    onChange={(e) => setNewAwayTeam(e.target.value)}
                    className="flex-1 bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-sm outline-none focus:border-white/30"
                    placeholder="Visitante"
                  />
                </div>
              </div>

              {/* Resultado */}
              <div className="mb-4">
                <label className="block text-xs text-white/60 mb-2">Resultado (90' / tiempo extra)</label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={homeGoals}
                    onChange={(e) => setHomeGoals(e.target.value)}
                    className="w-20 bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-center text-lg font-bold outline-none focus:border-white/30"
                    placeholder="0"
                  />
                  <span className="text-white/40 font-bold">–</span>
                  <input
                    type="number"
                    min={0}
                    max={30}
                    value={awayGoals}
                    onChange={(e) => setAwayGoals(e.target.value)}
                    className="w-20 bg-white/10 border border-white/15 rounded-lg px-3 py-2 text-center text-lg font-bold outline-none focus:border-white/30"
                    placeholder="0"
                  />
                </div>
              </div>

              {/* Penales (solo si aplica) */}
              {["R32", "R16", "QF", "SF", "FINAL"].includes(editing.stage) && (
                <div className="mb-5">
                  <label className="flex items-center gap-2 cursor-pointer mb-2">
                    <input
                      type="checkbox"
                      checked={penalties}
                      onChange={(e) => setPenalties(e.target.checked)}
                      className="w-4 h-4 accent-white"
                    />
                    <span className="text-sm">¿Se definió por penales?</span>
                  </label>

                  {penalties && (
                    <div>
                      <label className="block text-xs text-white/60 mb-1">Ganador en penales</label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setPenWinner(newHomeTeam || editing.homeTeam)}
                          className={[
                            "flex-1 rounded-lg border py-2 text-sm transition",
                            penWinner === (newHomeTeam || editing.homeTeam)
                              ? "border-white bg-white/15 font-semibold"
                              : "border-white/20 hover:bg-white/10",
                          ].join(" ")}
                        >
                          {newHomeTeam || editing.homeTeam}
                        </button>
                        <button
                          type="button"
                          onClick={() => setPenWinner(newAwayTeam || editing.awayTeam)}
                          className={[
                            "flex-1 rounded-lg border py-2 text-sm transition",
                            penWinner === (newAwayTeam || editing.awayTeam)
                              ? "border-white bg-white/15 font-semibold"
                              : "border-white/20 hover:bg-white/10",
                          ].join(" ")}
                        >
                          {newAwayTeam || editing.awayTeam}
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {saveMsg && (
                <p className="text-sm mb-3">{saveMsg}</p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={() => setEditing(null)}
                  className="flex-1 rounded-xl border border-white/20 py-2.5 text-sm hover:bg-white/10 transition"
                >
                  Cancelar
                </button>
                <button
                  onClick={saveResult}
                  disabled={saving}
                  className="flex-1 rounded-xl bg-white text-slate-950 font-semibold py-2.5 text-sm hover:bg-white/90 transition disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar resultado"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}