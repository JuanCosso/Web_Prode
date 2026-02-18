"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { KickMemberButton } from "./KickMemberButton";

type Room = { id: string; name: string; code: string; editPolicy: string };
type Me = { id: string; displayName: string };

type MemberRole = "OWNER" | "ADMIN" | "MEMBER";
type Member = {
  id: string; // memberId
  userId: string;
  displayName: string;
  contributionText: string;
  role: MemberRole;
};

type Match = {
  id: string;
  stage: string;
  group: string | null;
  matchday: number | null;
  kickoffAt: string | Date;
  kickoffLabel: string;
  homeTeam: string;
  awayTeam: string;
};

type MyPred = {
  matchId: string;
  predHomeGoals: number;
  predAwayGoals: number;
  predPenWinner: string | null;
};

type StandingRow = {
  userId: string;
  displayName: string;
  points: number;
  exactHits: number;
  outcomeHits: number;
  contributionText?: string | null;
};

type LivePred = { matchId: string; userId: string; displayName: string; h: number; a: number };

function modeLabel(editPolicy: string) {
  return editPolicy === "ALLOW_UNTIL_ROUND_CLOSE" ? "Desafío" : "Mundial";
}

function Flag({ code, alt }: { code?: string; alt: string }) {
  const c = (code || "").toLowerCase().trim();
  if (!c) return null;
  return (
    <img
      src={`https://flagcdn.com/h24/${c}.png`}
      srcSet={`https://flagcdn.com/h48/${c}.png 2x`}
      height={24}
      width={36}
      className="h-4 w-6 rounded-[3px] border border-white/10 object-cover shrink-0"
      alt={alt}
      loading="lazy"
    />
  );
}

function normTeam(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

const TEAM_TO_FLAG_NORM: Record<string, string> = {
  argentina: "ar",
  brasil: "br",
  brazil: "br",
  uruguay: "uy",
  paraguay: "py",
  chile: "cl",
  colombia: "co",
  ecuador: "ec",
  peru: "pe",
  venezuela: "ve",
  bolivia: "bo",

  mexico: "mx",
  "méxico": "mx",
  canada: "ca",
  "canadá": "ca",
  "estados unidos": "us",
  usa: "us",
  "united states": "us",

  alemania: "de",
  germany: "de",
  francia: "fr",
  france: "fr",
  espana: "es",
  "españa": "es",
  spain: "es",
  italia: "it",
  italy: "it",
  portugal: "pt",

  "paises bajos": "nl",
  "países bajos": "nl",
  netherlands: "nl",
  holanda: "nl",
  belgica: "be",
  "bélgica": "be",
  belgium: "be",
  suiza: "ch",
  switzerland: "ch",

  sudafrica: "za",
  "sudáfrica": "za",
  "south africa": "za",
  japon: "jp",
  "japón": "jp",
  japan: "jp",
  "corea del sur": "kr",
  "south korea": "kr",

  qatar: "qa",
  marruecos: "ma",
  morocco: "ma",
  haiti: "ht",
  escocia: "gb-sct",
  australia: "au",
  curazao: "cw",

  "costa de marfil": "ci",
  tunez: "tn",
  iran: "ir",
  egipto: "eg",
  "nueva zelanda": "nz",

  "cabo verde": "cv",
  "arabia saudita": "sa",
  senegal: "sn",
  noruega: "no",
  austria: "at",

  jordania: "jo",
  argelia: "dz",
  uzbekistan: "uz",
  inglaterra: "gb-eng",
  croacia: "hr",

  ghana: "gh",
  panama: "pa",
};

function flagCodeFor(team: string) {
  return TEAM_TO_FLAG_NORM[normTeam(team)] || "";
}

export default function RoomClient({
  room,
  me,
  members,
  canKick,
  isOwner = false,
  matches,
  myPreds,
  standings,
  playedCount,
}: {
  room: Room;
  me: Me;
  members: Member[];
  canKick: boolean;
  isOwner?: boolean;
  matches: Match[];
  myPreds: MyPred[];
  standings: StandingRow[];
  playedCount: number;
}) {
  const router = useRouter();

  // --- ELIMINAR SALA (solo OWNER) ---
  async function deleteRoom() {
    const ok = confirm(
      "Vas a eliminar la sala.\n\nEsto borra miembros, predicciones y todo.\n¿Confirmás?"
    );
    if (!ok) return;

    const res = await fetch(`/api/rooms/${room.id}`, { method: "DELETE" });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(data?.error || "No se pudo eliminar");
      return;
    }

    router.push("/");
    router.refresh();
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
    return [
      { id: "ME", userId: me.id, displayName: me.displayName, contributionText: "", role: myRole } as Member,
      ...rest,
    ];
  }, [members, me.id, me.displayName, myRole]);

  const [draft, setDraft] = useState(() => {
    const by = new Map<string, MyPred>();
    for (const p of myPreds) by.set(p.matchId, p);
    const initial: Record<string, { h: string; a: string }> = {};
    for (const m of matches) {
      const p = by.get(m.id);
      initial[m.id] = {
        h: p ? String(p.predHomeGoals) : "",
        a: p ? String(p.predAwayGoals) : "",
      };
    }
    return initial;
  });

  const [livePreds, setLivePreds] = useState<LivePred[]>([]);
  useEffect(() => {
    let alive = true;

    fetch("/api/auth/ensure-user", { method: "POST" });

    async function tick() {
      try {
        const res = await fetch(`/api/rooms/${room.id}/predictions?stage=GROUP`, {
          cache: "no-store",
        });
        const data = await res.json().catch(() => ({}));
        if (alive && res.ok && Array.isArray(data?.predictions)) {
          setLivePreds(data.predictions as LivePred[]);
        }
      } catch {
        // ignore
      }
    }

    tick();
    const id = setInterval(tick, 2500);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [room.id]);

  const liveByMatchUser = useMemo(() => {
    const m = new Map<string, { h: number; a: number }>();
    for (const p of livePreds) {
      m.set(`${p.matchId}__${p.userId}`, { h: p.h, a: p.a });
    }
    return m;
  }, [livePreds]);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function saveAll() {
    setSaving(true);
    setMsg(null);

    const payload = Object.entries(draft)
      .map(([matchId, v]) => {
        if (v.h.trim() === "" && v.a.trim() === "") return null;
        return { matchId, predHomeGoals: Number(v.h), predAwayGoals: Number(v.a) };
      })
      .filter(Boolean) as Array<{ matchId: string; predHomeGoals: number; predAwayGoals: number }>;

    const res = await fetch(`/api/rooms/${room.id}/predictions`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ predictions: payload }),
    });

    setSaving(false);
    setMsg(res.ok ? "Guardado ✅" : "Error al guardar.");
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: "url('/img/wallpaper.webp')" }}
        />
        <div className="absolute inset-0 backdrop-blur-lg bg-slate-950/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/65" />
      </div>

      <header className="relative z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-wide">
            Prode Mundial 2026
          </Link>
          <Link
            href="/profile"
            className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium backdrop-blur transition hover:border-white/30 hover:bg-white/15"
          >
            {me.displayName}
          </Link>
        </div>
      </header>

      <section className="relative z-10">
        <div className="mx-auto max-w-7xl px-4 pb-14 sm:px-6">
          {/* Header sala */}
          <div className="rounded-3xl border border-white/12 bg-white/8 p-5 backdrop-blur sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div className="min-w-0">
                <h1 className="truncate text-2xl font-semibold">{room.name}</h1>
                <div className="mt-1 text-sm text-white/70">
                  Código: <span className="font-mono text-white">{room.code}</span>
                  <span className="text-white/40"> · </span>
                  Modo: <span className="text-white">{modeLabel(room.editPolicy)}</span>
                  <span className="text-white/40"> · </span>
                  <span className="text-white/70">
                    Jugados: <span className="text-white">{playedCount}</span>/{matches.length}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={saveAll}
                  disabled={saving}
                  className="rounded-2xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:opacity-50"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>

                {isOwner && (
                  <button
                    onClick={deleteRoom}
                    className="rounded-2xl bg-red-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-red-700"
                  >
                    Eliminar sala
                  </button>
                )}

                <Link
                  href="/"
                  className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur transition hover:border-white/30 hover:bg-white/15"
                >
                  Volver
                </Link>
              </div>
            </div>

            {/* Participantes y Pozo */}
            <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3">
              <div className="text-xs font-semibold text-white/70 uppercase tracking-wider">
                Participantes
              </div>

              <div className="mt-2 flex flex-wrap gap-2">
                {members.map((m) => {
                  const isMe = m.userId === me.id;
                  const isOwnerRole = m.role === "OWNER";
                  const isAdmin = m.role === "ADMIN" || m.role === "OWNER";
                  const showKick = canKick && !isMe && !isOwnerRole;

                  return (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs"
                      title={m.contributionText || "sin aporte"}
                    >
                      <span className="text-white font-medium">{m.displayName}</span>

                      {isAdmin && (
                        <span className="rounded-full border border-white/15 bg-white/10 px-2 py-[2px] text-[10px] text-white/80">
                          {m.role === "OWNER" ? "👑 Admin" : "⭐ Admin"}
                        </span>
                      )}

                      <span className="text-white/50">— {m.contributionText || "sin aporte"}</span>

                      {showKick && (
                        <KickMemberButton
                          roomId={room.id}
                          memberId={m.id}
                          displayName={m.displayName}
                        />
                      )}
                    </span>
                  );
                })}
              </div>
            </div>

            {msg && <div className="mt-3 text-sm text-white/80">{msg}</div>}
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_320px]">
            {/* IZQUIERDA: Grupos */}
            <div className="space-y-4">
              {groups.map(([g, list]) => (
                <div
                  key={g}
                  className="rounded-3xl border border-white/12 bg-white/8 backdrop-blur overflow-hidden"
                >
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
                              <th
                                key={mb.userId}
                                className={[
                                  "px-2 py-2 text-center whitespace-nowrap",
                                  mb.userId === me.id ? "text-white" : "text-white/80",
                                ].join(" ")}
                              >
                                {mb.displayName}
                              </th>
                            ))}
                          </tr>
                        </thead>

                        <tbody>
                          {list.map((m) => {
                            const kickoff = new Date(m.kickoffAt);
                            const lockedLocal =
                              room.editPolicy !== "ALLOW_UNTIL_ROUND_CLOSE"
                                ? Date.now() >= kickoff.getTime()
                                : false;

                            return (
                              <tr key={m.id} className="border-t border-white/10">
                                <td className="px-3 py-3">
                                  <div className="text-[11px] text-white/60 mb-1">{m.kickoffLabel}</div>
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
                                          <input
                                            value={draft[m.id]?.h ?? ""}
                                            onChange={(e) =>
                                              setDraft((d) => ({
                                                ...d,
                                                [m.id]: { ...(d[m.id] ?? { h: "", a: "" }), h: e.target.value },
                                              }))
                                            }
                                            disabled={lockedLocal}
                                            className="w-10 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-center outline-none"
                                            placeholder="-"
                                            inputMode="numeric"
                                          />
                                          <span className="text-white/40">-</span>
                                          <input
                                            value={draft[m.id]?.a ?? ""}
                                            onChange={(e) =>
                                              setDraft((d) => ({
                                                ...d,
                                                [m.id]: { ...(d[m.id] ?? { h: "", a: "" }), a: e.target.value },
                                              }))
                                            }
                                            disabled={lockedLocal}
                                            className="w-10 rounded-lg border border-white/10 bg-black/30 px-2 py-1 text-center outline-none"
                                            placeholder="-"
                                            inputMode="numeric"
                                          />
                                        </div>
                                      ) : (
                                        <div className="text-center font-semibold">
                                          {p ? `${p.h}-${p.a}` : <span className="text-white/40">—</span>}
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
              ))}
            </div>

            {/* DERECHA: Tabla de Posiciones */}
            <aside>
              <div className="rounded-3xl border border-white/12 bg-white/8 p-5 backdrop-blur">
                <div className="text-sm font-semibold mb-4 text-center">Tabla de Posiciones</div>
                <div className="overflow-hidden rounded-2xl border border-white/10">
                  <table className="w-full text-sm">
                    <thead className="bg-white/5">
                      <tr>
                        <th className="px-3 py-3 text-xs text-white/50 text-center font-medium uppercase tracking-wider">
                          #
                        </th>
                        <th className="px-3 py-3 text-xs text-white/50 text-center font-medium uppercase tracking-wider">
                          Jugador
                        </th>
                        <th className="px-3 py-3 text-xs text-white/50 text-center font-medium uppercase tracking-wider">
                          Pts
                        </th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-white/10">
                      {standings.map((r, idx) => (
                        <tr key={r.userId} className="hover:bg-white/5 transition-colors">
                          <td className="px-3 py-4 text-white/40 text-center align-middle">{idx + 1}</td>
                          <td className="px-3 py-4 font-medium text-center align-middle">{r.displayName}</td>
                          <td className="px-3 py-4 font-bold text-center align-middle text-white">{r.points}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </section>
    </main>
  );
}
