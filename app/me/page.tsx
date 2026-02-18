import Link from "next/link";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth-user";

export default async function MePage() {
  const me = await getCurrentUser();

  if (!me) {
    return (
      <main className="min-h-screen bg-slate-950 text-white">
        <div className="mx-auto max-w-3xl px-4 py-10">
          <h1 className="text-2xl font-semibold">Mis partidas</h1>
          <p className="mt-2 text-white/70">
            No se pudo identificar el usuario.
          </p>
          <div className="mt-6">
            <Link
              className="rounded-xl border border-white/20 px-4 py-2"
              href="/"
            >
              Volver
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const rooms = await prisma.room.findMany({
    where: {
      members: {
        some: { userId: me.id },
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      name: true,
      code: true,
      editPolicy: true,
      createdAt: true,
    },
    take: 50,
  });

  return (
    <main className="min-h-screen bg-slate-950 text-white">
      <div className="mx-auto max-w-4xl px-4 py-10">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-semibold">Mis partidas</h1>
            <p className="mt-1 text-white/70">
              Salas donde participás.
            </p>
          </div>
          <Link
            className="rounded-xl border border-white/20 px-4 py-2"
            href="/"
          >
            Inicio
          </Link>
        </div>

        <div className="mt-6 grid gap-3">
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
                    <div className="truncate text-lg font-semibold">
                      {r.name}
                    </div>
                    <div className="mt-1 text-sm text-white/70">
                      Código:{" "}
                      <span className="font-mono text-white">
                        {r.code}
                      </span>
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
