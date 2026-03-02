import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";
import { DisplayNameForm } from "./DisplayNameForm";

export default async function ProfilePage() {
  const me = await getOrCreateUser();

  const rooms = await prisma.room.findMany({
    where: { members: { some: { userId: me.id, status: "ACTIVE" } } },
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
            <h2 className="text-xs font-semibold uppercase tracking-widest text-white/40 mb-3">Mis partidas</h2>
            {rooms.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-sm text-white/40 backdrop-blur">
                Todavía no estás en ninguna sala.
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