import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth-user";

export default async function MePage() {
  const me = await getCurrentUser();

  if (!me) {
    return (
      <main className="relative min-h-screen overflow-hidden text-white">
        <div className="absolute inset-0">
          <div className="absolute inset-0 bg-cover bg-center scale-105" style={{ backgroundImage: "url('/img/wallpaper.webp')" }} />
          <div className="absolute inset-0 bg-slate-950/75" />
        </div>
        <div className="relative z-10 mx-auto max-w-4xl px-4 py-6 sm:px-6">
          <div className="mb-1">
            <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition">← Inicio</Link>
          </div>
          <p className="mt-4 text-white/60">No se pudo identificar el usuario.</p>
        </div>
      </main>
    );
  }

  const rooms = await prisma.room.findMany({
    where: { members: { some: { userId: me.id } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, code: true, editPolicy: true, createdAt: true },
    take: 50,
  });

  return (
    <main className="relative min-h-screen overflow-hidden text-white">
      <div className="absolute inset-0">
        <div className="absolute inset-0 bg-cover bg-center scale-105" style={{ backgroundImage: "url('/img/wallpaper.webp')" }} />
        <div className="absolute inset-0 bg-slate-950/75" />
      </div>

      <section className="relative z-10">
        <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6">

          <div className="mb-1">
            <Link href="/" className="text-xs text-white/40 hover:text-white/70 transition">← Inicio</Link>
          </div>
          <h1 className="text-2xl font-bold">Mis partidas</h1>
          <p className="mt-1 text-sm text-white/50">Todas las salas donde participás.</p>

          <div className="mt-6">
            {rooms.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-8 text-center backdrop-blur">
                <p className="text-white/40 text-sm mb-4">Todavía no estás en ninguna sala.</p>
                <div className="flex justify-center gap-3">
                  <Link href="/create" className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:-translate-y-0.5">Crear sala</Link>
                  <Link href="/join" className="rounded-xl border border-white/20 bg-white/10 px-4 py-2 text-sm font-medium backdrop-blur transition hover:bg-white/15">Unirse con código</Link>
                </div>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {rooms.map((r) => (
                  <Link
                    key={r.id}
                    href={`/room/${r.id}`}
                    className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5 backdrop-blur transition hover:bg-white/10 group"
                  >
                    <div className="min-w-0">
                      <div className="truncate text-sm font-semibold">{r.name}</div>
                      <div className="mt-0.5 text-xs text-white/35 font-mono">{r.code}</div>
                    </div>
                    <span className="ml-3 text-white/30 group-hover:text-white/60 transition shrink-0 text-sm">→</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

        </div>
      </section>
    </main>
  );
}