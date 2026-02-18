import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";
import { DisplayNameForm } from "./DisplayNameForm";

export default async function ProfilePage() {
  // ✅ Google (session) o invitado (cookie)
  const me = await getOrCreateUser();

  const rooms = await prisma.room.findMany({
    where: { members: { some: { userId: me.id } } },
    orderBy: { createdAt: "desc" },
    select: { id: true, name: true, code: true, editPolicy: true, createdAt: true },
    take: 50,
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Perfil</h1>
            <p className="mt-1 text-white/70">
              Sesión:{" "}
              <span className="text-white">{me.email ?? "Invitado (cookie)"}</span>
            </p>
          </div>
          <Link className="rounded-xl border border-white/20 px-4 py-2" href="/">
            Inicio
          </Link>
        </div>

        {/* Cambiar nombre (único global) */}
        <div className="mt-6">
          <DisplayNameForm initialName={me.displayName ?? "Invitado"} />
          <p className="mt-2 text-xs text-white/50">
            Solo letras/números, espacios simples, 3–25 caracteres. Debe ser único globalmente.
          </p>
        </div>

        {/* Mis partidas */}
        <div className="mt-10 flex items-end justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Mis partidas</h2>
            <p className="mt-1 text-white/70">Salas donde participás.</p>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {rooms.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4 text-white/70">
              Todavía no estás en ninguna sala.
            </div>
          ) : (
            rooms.map((r) => (
              <Link
                key={r.id}
                href={`/room/${r.id}`}
                className="rounded-2xl border border-white/10 bg-white/5 p-4 hover:bg-white/10 transition"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold">{r.name}</div>
                    <div className="mt-1 text-sm text-white/70">
                      Código: <span className="font-mono text-white">{r.code}</span>
                      <span className="text-white/40"> · </span>
                      {r.editPolicy}
                    </div>
                  </div>
                  <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">
                    Entrar
                  </span>
                </div>
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
