import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth-user";
import { AuthButton } from "@/components/auth/AuthButton";

export default async function Home() {
  const me = await getCurrentUser();

  const recentRooms = me
    ? await prisma.room.findMany({
        where: { members: { some: { userId: me.id, status: "ACTIVE" } } },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, code: true, editPolicy: true },
        take: 5,
      })
    : [];

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      {/* Fondo */}
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center scale-105"
          style={{ backgroundImage: "url('/img/wallpaper.webp')" }}
        />
        <div className="absolute inset-0 bg-slate-950/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/70" />
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.07]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/12 border border-white/15 backdrop-blur overflow-hidden group-hover:bg-white/18 transition">
              <span className="text-lg">⚽</span>
            </div>
            <span className="text-sm font-semibold tracking-wide hidden sm:block">
              Prode Mundial 2026
            </span>
            <span className="text-sm font-semibold tracking-wide sm:hidden">
              Prode 2026
            </span>
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium backdrop-blur transition hover:border-white/30 hover:bg-white/15"
            >
              {me?.displayName?.trim() ? me.displayName : "Perfil"}
            </Link>
            <AuthButton />
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative z-10">
        <div className="mx-auto flex min-h-[calc(100vh-61px)] max-w-6xl flex-col items-center justify-center px-4 pb-16 pt-8 sm:px-6">

          <div className="text-center max-w-2xl w-full">
            <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl">
              ¿Quién sabe más
              <br />
              <span className="text-white/60">de fútbol entre vos y tus amigos?</span>
            </h1>
            <p className="mt-5 text-base text-white/55 sm:text-lg">
              Predecí resultados, sumá puntos y demostralo.
            </p>
          </div>

          <div className="mt-8 flex flex-col w-full gap-3 sm:flex-row sm:justify-center sm:w-auto">
            <Link
              href="/create"
              className="rounded-2xl bg-white px-7 py-3.5 text-center text-sm font-semibold text-slate-950 shadow-md transition hover:-translate-y-0.5 hover:shadow-xl active:translate-y-0 active:shadow-md"
            >
              Crear partida
            </Link>
            <Link
              href="/join"
              className="rounded-2xl border border-white/25 bg-white/10 px-7 py-3.5 text-center text-sm font-semibold backdrop-blur transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/15 active:translate-y-0"
            >
              Unirse con código
            </Link>
          </div>

          {me && (
            <div className="mt-12 w-full max-w-md">
              <div className="mb-3 flex items-center justify-between px-1">
                <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">
                  Tus partidas
                </h2>
                <Link href="/me" className="text-xs text-white/40 hover:text-white/70 transition">
                  Ver todas →
                </Link>
              </div>

              {recentRooms.length === 0 ? (
                <div className="rounded-2xl border border-white/10 bg-white/5 p-5 text-center text-sm text-white/40 backdrop-blur">
                  Todavía no estás en ninguna sala.
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {recentRooms.map((r) => (
                    <Link
                      key={r.id}
                      href={`/room/${r.id}`}
                      className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/7 px-4 py-3.5 backdrop-blur transition hover:bg-white/12 hover:border-white/18 group"
                    >
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold">{r.name}</div>
                        <div className="mt-0.5 text-xs text-white/35 font-mono tracking-wider">{r.code}</div>
                      </div>
                      <span className="ml-3 text-white/30 group-hover:text-white/60 transition text-sm shrink-0">→</span>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}