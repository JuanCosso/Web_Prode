"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function JoinPage() {
  const r = useRouter();

  const [code, setCode] = useState("");
  const [contributionText, setContributionText] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onJoin() {
    setLoading(true);
    setErr(null);

    const cleanCode = code.trim().toUpperCase();

    const res = await fetch("/api/rooms/join", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        code: cleanCode,
        contributionText: contributionText.trim(),
      }),
    });

    const data = await res.json().catch(() => ({}));
    setLoading(false);

    if (!res.ok) return setErr(data?.error ? "Código inválido / sala no encontrada" : "Error");
    r.push(`/room/${data.roomId}`);
  }

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      {/* Wallpaper blurred background */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: "url('/img/wallpaper.webp')" }}
        />
        {/* Menos difuminado que antes */}
        <div className="absolute inset-0 backdrop-blur-lg bg-slate-950/55" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/20 to-black/65" />
      </div>

      {/* Top bar */}
      <header className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-wide">
            Prode Mundial 2026
          </Link>

          <Link
            href="/"
            className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium backdrop-blur transition hover:border-white/30 hover:bg-white/15"
          >
            Volver
          </Link>
        </div>
      </header>

      {/* Center card */}
      <section className="relative z-10">
        <div className="mx-auto flex min-h-[calc(100vh-76px)] max-w-6xl items-center px-4 pb-14 sm:px-6">
          <div className="mx-auto w-full max-w-xl">
            <div className="rounded-3xl border border-white/12 bg-white/8 p-6 backdrop-blur sm:p-7">
              <h1 className="text-2xl font-semibold">Unirse a una partida</h1>
              <p className="mt-2 text-sm text-white/70">
                Tu nombre se toma del{" "}
                <Link href="/profile" className="underline underline-offset-2 hover:text-white">
                  Perfil
                </Link>
                .
              </p>

              {/* Código */}
              <div className="mt-6">
                <label className="block text-sm text-white/70">Código</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-sm outline-none uppercase tracking-wider backdrop-blur placeholder:text-white/40 focus:border-white/30"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  placeholder="Ej: A1B2C3"
                  autoCapitalize="characters"
                  autoCorrect="off"
                />
              </div>

              {/* Pozo */}
              <div className="mt-5">
                <label className="block text-sm text-white/70">¿Qué ponés al pozo?</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-sm outline-none backdrop-blur placeholder:text-white/40 focus:border-white/30"
                  value={contributionText}
                  onChange={(e) => setContributionText(e.target.value)}
                  placeholder="Ej: $2000 / una cerveza / una pizza"
                />
                <p className="mt-2 text-xs text-white/55">
                  Esto se muestra dentro de la sala para que quede claro el pozo entre participantes.
                </p>
              </div>

              {err && <p className="mt-4 text-sm text-red-300">{err}</p>}

              <button
                onClick={onJoin}
                disabled={loading || !code.trim()}
                className="mt-6 w-full rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Uniéndote..." : "Unirse"}
              </button>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
