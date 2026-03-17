// app/api/admin/matches/bulk/route.ts
//
// PATCH /api/admin/matches/bulk
// Body: { updates: BulkMatchUpdate[] }
//
// Procesa todos los resultados en una sola transacción de Prisma
// y luego hace broadcast SSE a todos los clientes conectados.

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth-user";
import { broadcastMatchUpdate } from "@/src/lib/sse";

type BulkMatchUpdate = {
  id: string;
  homeGoals: number | null;
  awayGoals: number | null;
  decidedByPenalties: boolean;
  penWinner: string | null;
  homeTeam?: string;
  awayTeam?: string;
};

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

function validateUpdate(u: BulkMatchUpdate): string | null {
  if (!u.id || typeof u.id !== "string") return "id requerido";
  if (u.homeGoals !== null && u.homeGoals !== undefined) {
    if (!Number.isInteger(u.homeGoals) || u.homeGoals < 0 || u.homeGoals > 30)
      return `homeGoals inválido en partido ${u.id}`;
  }
  if (u.awayGoals !== null && u.awayGoals !== undefined) {
    if (!Number.isInteger(u.awayGoals) || u.awayGoals < 0 || u.awayGoals > 30)
      return `awayGoals inválido en partido ${u.id}`;
  }
  if (u.decidedByPenalties === true) {
    if (u.homeGoals !== u.awayGoals) return `penales requieren empate en partido ${u.id}`;
    if (!u.penWinner?.trim()) return `penWinner requerido en partido ${u.id}`;
  }
  return null;
}

export async function PATCH(req: Request) {
  // Auth
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  if (!isAdmin(me.email)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body?.updates || !Array.isArray(body.updates) || body.updates.length === 0) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const updates: BulkMatchUpdate[] = body.updates;

  // Validar todos antes de tocar la DB
  for (const u of updates) {
    const err = validateUpdate(u);
    if (err) return NextResponse.json({ error: err }, { status: 400 });
  }

  // Transacción única — todos o ninguno
  const updated = await prisma.$transaction(
    updates.map((u) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const data: Record<string, any> = {
        homeGoals: u.homeGoals ?? null,
        awayGoals: u.awayGoals ?? null,
        decidedByPenalties: u.decidedByPenalties ?? false,
        penWinner: u.decidedByPenalties ? (u.penWinner?.trim() ?? null) : null,
      };
      if (u.homeTeam?.trim()) data.homeTeam = u.homeTeam.trim();
      if (u.awayTeam?.trim()) data.awayTeam = u.awayTeam.trim();

      return prisma.match.update({
        where: { id: u.id },
        data,
        select: {
          id: true, fifaId: true, stage: true, group: true,
          homeTeam: true, awayTeam: true,
          homeGoals: true, awayGoals: true,
          decidedByPenalties: true, penWinner: true,
          kickoffAt: true,
        },
      });
    })
  );

  // Broadcast SSE a todos los clientes conectados
  broadcastMatchUpdate(updated);

  return NextResponse.json({ ok: true, updated: updated.length, matches: updated });
}