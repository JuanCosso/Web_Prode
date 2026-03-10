import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth-user";
import { AuthButton } from "@/components/auth/AuthButton";
import DynamicHeroTitle from "@/components/DynamicHeroTitle"; // Asumo que lo crearás en este path, o podés ponerlo en este mismo archivo abajo.

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
          style={{ backgroundImage: "url('/img/LogoProde.webp')" }}
        />
        <div className="absolute inset-0 bg-slate-950/65" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/55 via-black/15 to-black/70" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.07]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 sm:px-6">
        <Link href="/" className="flex items-center group">
          <img
            src="/img/IconoProdeH.webp"
            alt="Logo"
            width={908}
            height={161}
            className="h-10 w-auto object-contain"
          />
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

          <div className="text-center max-w-3xl w-full">
            <DynamicHeroTitle />
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