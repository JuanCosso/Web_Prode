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

  // Estado cuando la sala es CERRADA y quedamos en PENDING
  const [pendingRoomId, setPendingRoomId] = useState<string | null>(null);
  const [pendingRoomCode, setPendingRoomCode] = useState<string>("");

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

    if (!res.ok) {
      return setErr(
        data?.error === "ROOM_NOT_FOUND"
          ? "Sala no encontrada. Revisá el código."
          : data?.error === "CODE_REQUIRED"
          ? "Ingresá un código."
          : "Error al unirse. Intentá de nuevo."
      );
    }

    // ✅ roomId siempre viene en la respuesta ahora
    const roomId = data.roomId as string;

    if (data.status === "PENDING") {
      // Sala cerrada → mostrar pantalla de espera
      setPendingRoomId(roomId);
      setPendingRoomCode(cleanCode);
      return;
    }

    // Sala abierta → ir directo
    r.push(`/room/${roomId}`);
  }

  // ─── Pantalla de "solicitud pendiente" ────────────────────────────────────
  if (pendingRoomId) {
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
          <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
            <Link href="/" className="text-sm font-semibold tracking-wide">
              Prode Mundial 2026
            </Link>
          </div>
        </header>

        <section className="relative z-10 flex min-h-[calc(100vh-76px)] items-center justify-center px-4">
          <div className="w-full max-w-md rounded-3xl border border-yellow-500/25 bg-yellow-500/8 p-8 backdrop-blur text-center">
            <div className="text-4xl mb-4">⏳</div>
            <h2 className="text-xl font-semibold text-white">Solicitud enviada</h2>
            <p className="mt-3 text-sm text-white/70 leading-relaxed">
              Esta sala es <span className="text-yellow-300 font-semibold">cerrada</span>. Tu solicitud fue enviada y está esperando que el Owner o un Admin te apruebe.
            </p>
            <p className="mt-2 text-xs text-white/50">
              Código: <span className="font-mono text-white">{pendingRoomCode}</span>
            </p>

            <div className="mt-6 flex flex-col gap-3">
              {/* Botón para chequear si ya fue aprobado */}
              <CheckApprovalButton roomId={pendingRoomId} />

              <Link
                href="/"
                className="rounded-2xl border border-white/20 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white hover:bg-white/15 transition"
              >
                Volver al inicio
              </Link>
            </div>
          </div>
        </section>
      </main>
    );
  }

  // ─── Formulario de join normal ─────────────────────────────────────────────
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

              <div className="mt-6">
                <label className="block text-sm text-white/70">Código de la sala</label>
                <input
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-sm uppercase tracking-widest outline-none backdrop-blur-sm placeholder:text-white/40 placeholder:normal-case placeholder:tracking-normal focus:border-white/30"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="Ej: ABC123"
                  maxLength={12}
                />
              </div>

              <div className="mt-4">
                <label className="block text-sm text-white/70">¿Qué ponés al pozo? <span className="text-white/40">(opcional)</span></label>
                <input
                  className="mt-2 w-full rounded-2xl border border-white/15 bg-black/25 px-4 py-3 text-sm outline-none backdrop-blur-sm placeholder:text-white/40 focus:border-white/30"
                  value={contributionText}
                  onChange={(e) => setContributionText(e.target.value)}
                  placeholder="Ej: $1000 / Asado / Birra"
                />
              </div>

              {err && (
                <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  {err}
                </div>
              )}

              <div className="mt-6 flex items-center justify-end">
                <button
                  onClick={onJoin}
                  disabled={loading || !code.trim()}
                  className="rounded-xl bg-white px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {loading ? "Uniéndose..." : "Unirse"}
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}

// ─── Sub-componente: chequea si el usuario ya fue aprobado ────────────────────
function CheckApprovalButton({ roomId }: { roomId: string }) {
  const r = useRouter();
  const [checking, setChecking] = useState(false);
  const [stillPending, setStillPending] = useState(false);

  async function checkStatus() {
    setChecking(true);
    setStillPending(false);

    try {
      const res = await fetch(`/api/rooms/${roomId}/my-status`);
      const data = await res.json().catch(() => ({}));

      if (data.status === "ACTIVE") {
        r.push(`/room/${roomId}`);
      } else {
        setStillPending(true);
        setChecking(false);
      }
    } catch {
      setChecking(false);
    }
  }

  return (
    <div>
      <button
        onClick={checkStatus}
        disabled={checking}
        className="w-full rounded-2xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md disabled:opacity-50"
      >
        {checking ? "Verificando..." : "Ya me aprobaron, entrar →"}
      </button>
      {stillPending && (
        <p className="mt-2 text-xs text-yellow-300/80 text-center">
          Todavía no fuiste aprobado. Avisale al Owner.
        </p>
      )}
    </div>
  );
}