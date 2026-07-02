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

export async function GET() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  if (!isAdmin(me.email)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    // Traer todos los partidos de KO (no GROUP) ordenados por etapa
    const matches = await prisma.match.findMany({
      where: {
        stage: { not: "GROUP" },
      },
      orderBy: [{ stage: "asc" }, { matchday: "asc" }, { kickoffAt: "asc" }],
      select: {
        id: true,
        fifaId: true,
        stage: true,
        matchday: true,
        kickoffAt: true,
        city: true,
        homeTeam: true,
        awayTeam: true,
        homeGoals: true,
        awayGoals: true,
        decidedByPenalties: true,
        penWinner: true,
      },
    });

    // Agrupar por etapa y detectar problemas
    const byStage: Record<string, typeof matches> = {};
    for (const m of matches) {
      if (!byStage[m.stage]) byStage[m.stage] = [];
      byStage[m.stage].push(m);
    }

    // Mapeo de qué etapa viene antes de cada una
    const PREV_STAGE: Record<string, string | null> = {
      "R16": "R32",
      "QF": "R16",
      "SF": "QF",
      "TPP": "SF",
      "FINAL": "SF",
    };

    // Verificar placeholders sin resolver
    const issues: Array<{
      fifaId: string;
      stage: string;
      problem: string;
      match: (typeof matches)[0];
    }> = [];

    for (const m of matches) {
      const isPlaceholder = (val: string) =>
        /^((Ganador|Perdedor)\s|3° mejor|1° Grupo|2° Grupo)/.test(val?.trim() || "");

      // Si hay placeholder pero la etapa anterior está completa, es problema
      if (isPlaceholder(m.homeTeam)) {
        const prevStage = PREV_STAGE[m.stage];
        const prevStageMatches = prevStage ? byStage[prevStage] : [];
        const allCompleted = prevStageMatches.length > 0 && prevStageMatches.every(
          (p) => p.homeGoals !== null && p.awayGoals !== null
        );
        if (allCompleted) {
          issues.push({
            fifaId: m.fifaId || "???",
            stage: m.stage,
            problem: `homeTeam aún es placeholder: "${m.homeTeam}" pero ${prevStage} completado`,
            match: m,
          });
        }
      }

      if (isPlaceholder(m.awayTeam)) {
        const prevStage = PREV_STAGE[m.stage];
        const prevStageMatches = prevStage ? byStage[prevStage] : [];
        const allCompleted = prevStageMatches.length > 0 && prevStageMatches.every(
          (p) => p.homeGoals !== null && p.awayGoals !== null
        );
        if (allCompleted) {
          issues.push({
            fifaId: m.fifaId || "???",
            stage: m.stage,
            problem: `awayTeam aún es placeholder: "${m.awayTeam}" pero ${prevStage} completado`,
            match: m,
          });
        }
      }

      // Validar que equipos no sean vacíos
      if (!m.homeTeam?.trim()) {
        issues.push({
          fifaId: m.fifaId || "???",
          stage: m.stage,
          problem: "homeTeam vacío",
          match: m,
        });
      }
      if (!m.awayTeam?.trim()) {
        issues.push({
          fifaId: m.fifaId || "???",
          stage: m.stage,
          problem: "awayTeam vacío",
          match: m,
        });
      }
    }

    // Estadísticas por etapa
    const stats = Object.entries(byStage).map(([stage, stageMatches]) => {
      const played = stageMatches.filter((m) => m.homeGoals !== null && m.awayGoals !== null);
      return {
        stage,
        total: stageMatches.length,
        played: played.length,
        pending: stageMatches.length - played.length,
      };
    });

    return NextResponse.json({
      stats,
      issues,
      byStage: Object.entries(byStage).reduce(
        (acc, [stage, stageMatches]) => {
          acc[stage] = stageMatches.map((m) => ({
            id: m.id,
            fifaId: m.fifaId,
            matchday: m.matchday,
            kickoffAt: m.kickoffAt,
            city: m.city,
            homeTeam: m.homeTeam,
            awayTeam: m.awayTeam,
            result:
              m.homeGoals === null || m.awayGoals === null
                ? "PENDING"
                : m.decidedByPenalties
                  ? `${m.homeGoals}-${m.awayGoals} (${m.penWinner})`
                  : `${m.homeGoals}-${m.awayGoals}`,
          }));
          return acc;
        },
        {} as Record<string, any>
      ),
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
