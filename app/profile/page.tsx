import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";
import { DisplayNameForm } from "./DisplayNameForm";

export default async function ProfilePage() {
  const me = await getOrCreateUser();

  const rooms = await prisma.room.findMany({
    where: { members: { some: { userId: me.id, status: "ACTIVE" } } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true, name: true, code: true, editPolicy: true, createdAt: true,
      _count: { select: { members: { where: { status: "ACTIVE" } } } },
    },
    take: 50,
  });

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cover bg-center scale-105" style={{ backgroundImage: "url('/img/LogoProde.webp')" }} />
        <div className="absolute inset-0 bg-slate-950/75" />
      </div>

      <section className="relative z-10">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">

          <div className="mb-1">
            <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition">← Inicio</Link>
          </div>
          <h1 className="text-2xl font-bold">Perfil</h1>
          <p className="mt-1 text-sm text-white/50">{me.email ?? "Sesión de invitado"}</p>

          {/* Card nombre */}
          <div className="mt-6 rounded-3xl border border-white/12 bg-white/8 p-5 backdrop-blur">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-4">Nombre de jugador</h2>
            <DisplayNameForm initialName={me.displayName ?? "Invitado"} />
            <p className="mt-3 text-xs text-white/35">
              Solo letras/números, espacios simples, 3–25 caracteres. Único globalmente.
            </p>
          </div>

          {/* Mis partidas */}
          <div className="mt-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40">Mis partidas</h2>
              {rooms.length > 0 && (
                <Link href="/me" className="text-xs text-white/40 hover:text-white/70 transition">
                  Ver todas →
                </Link>
              )}
            </div>

            {rooms.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/40 backdrop-blur">
                Todavía no estás en ninguna sala.
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {rooms.map((r) => {
                  const memberCount = r._count.members;
                  return (
                    <Link
                      key={r.id}
                      href={`/room/${r.id}`}
                      className="group flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-5 py-4 backdrop-blur transition hover:bg-white/8 hover:border-white/18"
                    >
                      {/* Info sala */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="truncate text-sm font-semibold">{r.name}</span>
                          <span className="shrink-0 rounded-md border border-white/15 px-1.5 py-px font-mono text-[10px] text-white/40">
                            {r.code}
                          </span>
                        </div>
                        <div className="mt-1 flex items-center gap-3 text-xs text-white/40">
                          <span>{memberCount} {memberCount === 1 ? "jugador" : "jugadores"}</span>
                          <span>·</span>
                          <span>{r.editPolicy === "STRICT_PER_MATCH" ? "Mundial" : "Desafío"}</span>
                        </div>
                      </div>
                      <span className="ml-3 text-white/25 group-hover:text-white/50 transition shrink-0 text-sm">→</span>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

        </div>
      </section>
    </main>
  );
}