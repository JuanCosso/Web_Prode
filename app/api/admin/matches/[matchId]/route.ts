// app/api/admin/matches/[matchId]/route.ts
//
// PATCH /api/admin/matches/:matchId
// Body: { homeGoals, awayGoals, decidedByPenalties?, penWinner?, homeTeam?, awayTeam? }
//
// Protegido: solo el usuario cuyo email esté en ADMIN_EMAILS (var de entorno)
// puede llamar este endpoint.
//
// En .env.local agregar:
//   ADMIN_EMAILS=tuemail@gmail.com,otroadmin@gmail.com

import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getCurrentUser } from "@/src/lib/auth-user";

function isAdmin(email: string | null | undefined): boolean {
  if (!email) return false;
  const allowed = (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return allowed.includes(email.toLowerCase());
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  // Auth
  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!isAdmin(me.email)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const body = await req.json().catch(() => null);
  if (!body) {
    return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });
  }

  const {
    homeGoals,
    awayGoals,
    decidedByPenalties,
    penWinner,
    // Campos opcionales para actualizar equipos en KO cuando se conocen los clasificados
    homeTeam,
    awayTeam,
  } = body;

  // Validaciones básicas
  if (homeGoals !== undefined && homeGoals !== null) {
    if (!Number.isInteger(homeGoals) || homeGoals < 0 || homeGoals > 30) {
      return NextResponse.json({ error: "INVALID_HOME_GOALS" }, { status: 400 });
    }
  }
  if (awayGoals !== undefined && awayGoals !== null) {
    if (!Number.isInteger(awayGoals) || awayGoals < 0 || awayGoals > 30) {
      return NextResponse.json({ error: "INVALID_AWAY_GOALS" }, { status: 400 });
    }
  }

  // Si hay penales, el resultado debe ser empate y debe indicarse ganador
  if (decidedByPenalties === true) {
    if (homeGoals !== awayGoals) {
      return NextResponse.json(
        { error: "PENALTY_MATCH_MUST_BE_DRAW" },
        { status: 400 }
      );
    }
    if (!penWinner || typeof penWinner !== "string" || penWinner.trim() === "") {
      return NextResponse.json(
        { error: "PENALTY_WINNER_REQUIRED" },
        { status: 400 }
      );
    }
  }

  // Verificar que el partido existe
  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: { id: true, fifaId: true, stage: true, homeTeam: true, awayTeam: true },
  });
  if (!match) {
    return NextResponse.json({ error: "MATCH_NOT_FOUND" }, { status: 404 });
  }

  // Construir el objeto de actualización dinámicamente
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const data: Record<string, any> = {};

  if (homeGoals !== undefined) data.homeGoals = homeGoals === null ? null : homeGoals;
  if (awayGoals !== undefined) data.awayGoals = awayGoals === null ? null : awayGoals;
  if (decidedByPenalties !== undefined) data.decidedByPenalties = decidedByPenalties;
  if (penWinner !== undefined) data.penWinner = penWinner === null ? null : String(penWinner).trim();
  if (homeTeam !== undefined && typeof homeTeam === "string") data.homeTeam = homeTeam.trim();
  if (awayTeam !== undefined && typeof awayTeam === "string") data.awayTeam = awayTeam.trim();

  // Si se limpia decidedByPenalties, limpiar también penWinner
  if (decidedByPenalties === false) {
    data.penWinner = null;
  }

  const updated = await prisma.match.update({
    where: { id: matchId },
    data,
    select: {
      id: true,
      fifaId: true,
      stage: true,
      homeTeam: true,
      awayTeam: true,
      homeGoals: true,
      awayGoals: true,
      decidedByPenalties: true,
      penWinner: true,
      kickoffAt: true,
    },
  });

  return NextResponse.json({ ok: true, match: updated });
}

// GET: ver el estado actual de un partido (útil para la UI admin)
export async function GET(
  req: Request,
  { params }: { params: Promise<{ matchId: string }> }
) {
  const { matchId } = await params;

  const me = await getCurrentUser();
  if (!me) {
    return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  }
  if (!isAdmin(me.email)) {
    return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });
  }

  const match = await prisma.match.findUnique({
    where: { id: matchId },
    select: {
      id: true,
      fifaId: true,
      stage: true,
      group: true,
      matchday: true,
      homeTeam: true,
      awayTeam: true,
      homeGoals: true,
      awayGoals: true,
      decidedByPenalties: true,
      penWinner: true,
      kickoffAt: true,
      city: true,
    },
  });

  if (!match) {
    return NextResponse.json({ error: "MATCH_NOT_FOUND" }, { status: 404 });
  }

  return NextResponse.json({ match });
}