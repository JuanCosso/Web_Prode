"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

type EditPolicy = "STRICT_PER_MATCH" | "ALLOW_UNTIL_ROUND_CLOSE";
type AccessType = "OPEN" | "CLOSED";

export default function CreateRoomPage() {
  const r = useRouter();

  const [name, setName] = useState("Prode con amigos");
  const [editPolicy, setEditPolicy] = useState<EditPolicy>("STRICT_PER_MATCH");
  const [accessType, setAccessType] = useState<AccessType>("OPEN");
  const [myStake, setMyStake] = useState("");

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const modeLabel = useMemo(
    () => (editPolicy === "ALLOW_UNTIL_ROUND_CLOSE" ? "Desafío" : "Mundial"),
    [editPolicy]
  );

  const modeHelp = useMemo(() => {
    if (editPolicy === "ALLOW_UNTIL_ROUND_CLOSE") {
      return (
        <>
          En <span className="font-semibold text-white">modo Desafío</span> solo
          se pueden guardar los resultados{" "}
          <span className="font-semibold text-white">una única vez</span> previo
          al comienzo de{" "}
          <span className="font-semibold text-white">cada fase</span>.
        </>
      );
    }
    return (
      <>
        En <span className="font-semibold text-white">modo Mundial</span> se
        pueden colocar los resultados{" "}
        <span className="font-semibold text-white">
          hasta antes de comenzar cada partido
        </span>
        .
      </>
    );
  }, [editPolicy]);

  async function onCreate() {
    setLoading(true);
    setErr(null);

    const res = await fetch("/api/rooms", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        name,
        editPolicy,
        accessType,
        contributionText: myStake.trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      setLoading(false);
      return setErr(data?.error ? "Datos inválidos" : "Error creando room");
    }

    const roomId = data?.room?.id as string;
    r.push(`/room/${roomId}`);
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
        </div>
      </header>

      <section className="relative z-10">
        <div className="mx-auto max-w-xl px-4 pb-14 sm:px-6">
          <div className="rounded-3xl border border-white/12 bg-white/8 p-6 backdrop-blur sm:p-8">
            <h1 className="text-2xl font-semibold">Crear sala</h1>
            <p className="mt-1 text-sm text-white/60">
              Configurá los detalles de tu sala. El resto lo completa cada uno al unirse.
            </p>

            {/* Nombre */}
            <div className="mt-6">
              <label className="block text-sm text-white/70">Nombre de la sala</label>
              <input
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-sm outline-none backdrop-blur-sm placeholder:text-white/40 focus:border-white/30"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej: Prode con amigos"
              />
            </div>

            {/* Modo de edición */}
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm text-white/70">Modo</label>
                <span className="text-xs text-white/60">
                  Seleccionado: <span className="text-white/85">{modeLabel}</span>
                </span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setEditPolicy("STRICT_PER_MATCH")}
                  className={[
                    "rounded-2xl border px-4 py-4 text-left transition backdrop-blur-sm",
                    editPolicy === "STRICT_PER_MATCH"
                      ? "border-white/30 bg-white/14"
                      : "border-white/12 bg-white/7 hover:border-white/22 hover:bg-white/10",
                  ].join(" ")}
                >
                  <div className="text-sm font-semibold">Mundial</div>
                  <div className="mt-1 text-xs text-white/70">
                    Se edita hasta antes de cada partido.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setEditPolicy("ALLOW_UNTIL_ROUND_CLOSE")}
                  className={[
                    "rounded-2xl border px-4 py-4 text-left transition backdrop-blur-sm",
                    editPolicy === "ALLOW_UNTIL_ROUND_CLOSE"
                      ? "border-white/30 bg-white/14"
                      : "border-white/12 bg-white/7 hover:border-white/22 hover:bg-white/10",
                  ].join(" ")}
                >
                  <div className="text-sm font-semibold">Desafío</div>
                  <div className="mt-1 text-xs text-white/70">
                    Se guarda una sola vez por fase.
                  </div>
                </button>
              </div>

              <div className="mt-4 rounded-2xl border border-white/12 bg-black/18 p-4 text-sm text-white/75">
                {modeHelp}
              </div>
            </div>

            {/* Acceso: Abierta / Cerrada */}
            <div className="mt-5">
              <div className="flex items-center justify-between gap-3">
                <label className="block text-sm text-white/70">Acceso</label>
                <span className="text-xs text-white/60">
                  Seleccionado:{" "}
                  <span className={accessType === "CLOSED" ? "text-yellow-400" : "text-emerald-400"}>
                    {accessType === "CLOSED" ? "Cerrada" : "Abierta"}
                  </span>
                </span>
              </div>

              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setAccessType("OPEN")}
                  className={[
                    "rounded-2xl border px-4 py-4 text-left transition backdrop-blur-sm",
                    accessType === "OPEN"
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-white/12 bg-white/7 hover:border-white/22 hover:bg-white/10",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔓</span>
                    <span className="text-sm font-semibold">Abierta</span>
                  </div>
                  <div className="mt-1 text-xs text-white/70">
                    Cualquiera con el código puede unirse directamente.
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setAccessType("CLOSED")}
                  className={[
                    "rounded-2xl border px-4 py-4 text-left transition backdrop-blur-sm",
                    accessType === "CLOSED"
                      ? "border-yellow-500/50 bg-yellow-500/10"
                      : "border-white/12 bg-white/7 hover:border-white/22 hover:bg-white/10",
                  ].join(" ")}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">🔒</span>
                    <span className="text-sm font-semibold">Cerrada</span>
                  </div>
                  <div className="mt-1 text-xs text-white/70">
                    El Owner o un Admin deben aprobar a cada participante.
                  </div>
                </button>
              </div>

              {accessType === "CLOSED" && (
                <div className="mt-3 rounded-2xl border border-yellow-500/20 bg-yellow-500/8 p-3 text-xs text-yellow-200/80">
                  Los participantes que se unan con el código quedarán en espera hasta que vos o un Admin los aprueben desde dentro de la sala.
                </div>
              )}
            </div>

            {/* Pozo del creador */}
            <div className="mt-5">
              <label className="block text-sm text-white/70">¿Qué ponés al pozo?</label>
              <input
                className="mt-2 w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-sm outline-none backdrop-blur-sm placeholder:text-white/40 focus:border-white/30"
                value={myStake}
                onChange={(e) => setMyStake(e.target.value)}
                placeholder="Ej: $1000 / Asado / Birra / Lo que sea"
              />
              <p className="mt-2 text-xs text-white/55">
                Esto es por participante. Cuando se unan, ellos también completan lo suyo.
              </p>
            </div>

            {err && <p className="mt-4 text-sm text-red-300">{err}</p>}

            <div className="mt-6 flex items-center justify-end">
              <button
                onClick={onCreate}
                disabled={loading || !name.trim()}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Creando..." : "Crear sala"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}