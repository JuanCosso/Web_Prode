import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { AuthButton } from "@/components/auth/AuthButton";
import { getCurrentUser } from "@/src/lib/auth-user";

export default async function Home() {
  const me = await getCurrentUser();

  const recentRooms = me
    ? await prisma.room.findMany({
        where: { members: { some: { userId: me.id } } },
        orderBy: { createdAt: "desc" },
        select: { id: true, name: true, code: true, editPolicy: true },
        take: 5,
      })
    : [];

  const label = me?.displayName?.trim() ? me.displayName : "Perfil";

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0">
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: "url('/img/wallpaper.webp')" }}
        />
        <div className="absolute inset-0 bg-slate-950/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-black/60" />
      </div>

      <header className="relative z-10">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
          <Link href="/" className="text-sm font-semibold tracking-wide">
            Prode Mundial 2026
          </Link>

          <div className="flex items-center gap-2">
            <Link
              href="/profile"
              className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium backdrop-blur transition hover:border-white/30 hover:bg-white/15"
            >
              {label}
            </Link>

            <AuthButton />
          </div>
        </div>
      </header>

      <section className="relative z-10">
        <div className="mx-auto flex min-h-[calc(100vh-76px)] max-w-6xl items-center px-4 pb-14 sm:px-6">
          <div className="mx-auto w-full max-w-2xl text-center">
            <h1 className="text-4xl font-semibold leading-tight sm:text-5xl">
              Predecí resultados con amigos a ver quien sabe más de fútbol
            </h1>

            <p className="mt-4 text-base text-white/80 sm:text-lg">
              Elegí una opción:
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-center">
              <Link
                href="/create"
                className="rounded-2xl bg-white px-5 py-3 text-center text-sm font-semibold text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                Crear partida
              </Link>

              <Link
                href="/join"
                className="rounded-2xl border border-white/25 bg-white/10 px-5 py-3 text-center text-sm font-semibold backdrop-blur transition hover:-translate-y-0.5 hover:border-white/35 hover:bg-white/15"
              >
                Unirse con código
              </Link>
            </div>

            {me && (
              <div className="mt-10 rounded-3xl border border-white/12 bg-white/8 p-5 backdrop-blur-sm text-left">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">
                      Tus partidas
                    </div>
                    <div className="mt-1 text-xs text-white/70">
                      Acceso rápido a las salas donde ya participás.
                    </div>
                  </div>
                  <Link
                    href="/profile"
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold hover:bg-white/15"
                  >
                    Ver todas
                  </Link>
                </div>

                <div className="mt-4 grid gap-2">
                  {recentRooms.length === 0 ? (
                    <div className="rounded-2xl border border-white/10 bg-black/20 p-4 text-sm text-white/70">
                      Todavía no te uniste a ninguna sala.
                    </div>
                  ) : (
                    recentRooms.map((r) => (
                      <Link
                        key={r.id}
                        href={`/room/${r.id}`}
                        className="rounded-2xl border border-white/10 bg-black/20 px-4 py-3 hover:bg-black/30 transition"
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <div className="truncate font-semibold">
                              {r.name}
                            </div>
                            <div className="mt-1 text-xs text-white/65">
                              Código:{" "}
                              <span className="font-mono text-white">
                                {r.code}
                              </span>
                            </div>
                          </div>
                          <span className="text-xs text-white/70">
                            {r.editPolicy === "STRICT_PER_MATCH"
                              ? "Mundial"
                              : "Desafío"}
                          </span>
                        </div>
                      </Link>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}
