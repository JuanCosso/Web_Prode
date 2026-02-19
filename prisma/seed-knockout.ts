// prisma/seed-knockout.ts
// Ejecutar con: npx ts-node --compiler-options '{"module":"CommonJS"}' prisma/seed-knockout.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Convierte fecha ET (Eastern Time, UTC-4 en verano) a UTC
function etToUtcDate(dateISO: string, timeET: string): Date {
  const [h, m] = timeET.split(":").map(Number);
  const d = new Date(`${dateISO}T00:00:00Z`);
  // ET en verano = UTC-4, sumamos 4 horas
  d.setUTCHours(h + 4, m, 0, 0);
  return d;
}

// ─── Estructura del Mundial 2026 ────────────────────────────────────────────
// 32 equipos → 16 partidos en R32 (dieciseisavos)
// 16 → 8 partidos en R16 (octavos)
//  8 → 4 partidos en QF  (cuartos)
//  4 → 2 partidos en SF  (semis)
//  2 → 1 final + 1 tercer puesto
//
// Llave oficial FIFA 2026 (sorteo pendiente, usamos los cruces confirmados):
// 1A vs 2B, 1C vs 2D, 1E vs 2F, 1G vs 2H
// 1I vs 2J, 1K vs 2L, 1B vs 2A, 1D vs 2C
// etc. → los placeholders son suficientes para el prode

const knockoutMatches = [
  // ─── R32 (16avos de final) ─────────────────────────────────────────────
  // Fechas estimadas: 1–4 julio 2026
  {
    stage: "R32", matchday: 1,
    dateISO: "2026-07-01", timeET: "15:00", city: "Miami",
    homeTeam: "1° Grupo A", awayTeam: "2° Grupo B", fifaId: "R32-01",
  },
  {
    stage: "R32", matchday: 1,
    dateISO: "2026-07-01", timeET: "19:00", city: "Los Ángeles",
    homeTeam: "1° Grupo C", awayTeam: "2° Grupo D", fifaId: "R32-02",
  },
  {
    stage: "R32", matchday: 1,
    dateISO: "2026-07-02", timeET: "15:00", city: "Nueva York/Nueva Jersey",
    homeTeam: "1° Grupo E", awayTeam: "2° Grupo F", fifaId: "R32-03",
  },
  {
    stage: "R32", matchday: 1,
    dateISO: "2026-07-02", timeET: "19:00", city: "Dallas",
    homeTeam: "1° Grupo G", awayTeam: "2° Grupo H", fifaId: "R32-04",
  },
  {
    stage: "R32", matchday: 2,
    dateISO: "2026-07-03", timeET: "15:00", city: "Houston",
    homeTeam: "1° Grupo I", awayTeam: "2° Grupo J", fifaId: "R32-05",
  },
  {
    stage: "R32", matchday: 2,
    dateISO: "2026-07-03", timeET: "19:00", city: "Seattle",
    homeTeam: "1° Grupo K", awayTeam: "2° Grupo L", fifaId: "R32-06",
  },
  {
    stage: "R32", matchday: 2,
    dateISO: "2026-07-04", timeET: "15:00", city: "San Francisco",
    homeTeam: "1° Grupo B", awayTeam: "2° Grupo A", fifaId: "R32-07",
  },
  {
    stage: "R32", matchday: 2,
    dateISO: "2026-07-04", timeET: "19:00", city: "Boston",
    homeTeam: "1° Grupo D", awayTeam: "2° Grupo C", fifaId: "R32-08",
  },
  {
    stage: "R32", matchday: 3,
    dateISO: "2026-07-05", timeET: "15:00", city: "Atlanta",
    homeTeam: "1° Grupo F", awayTeam: "2° Grupo E", fifaId: "R32-09",
  },
  {
    stage: "R32", matchday: 3,
    dateISO: "2026-07-05", timeET: "19:00", city: "Kansas City",
    homeTeam: "1° Grupo H", awayTeam: "2° Grupo G", fifaId: "R32-10",
  },
  {
    stage: "R32", matchday: 3,
    dateISO: "2026-07-06", timeET: "15:00", city: "Vancouver",
    homeTeam: "1° Grupo J", awayTeam: "2° Grupo I", fifaId: "R32-11",
  },
  {
    stage: "R32", matchday: 3,
    dateISO: "2026-07-06", timeET: "19:00", city: "Guadalajara",
    homeTeam: "1° Grupo L", awayTeam: "2° Grupo K", fifaId: "R32-12",
  },
  {
    stage: "R32", matchday: 4,
    dateISO: "2026-07-07", timeET: "15:00", city: "Toronto",
    homeTeam: "3° mejor 1", awayTeam: "3° mejor 2", fifaId: "R32-13",
  },
  {
    stage: "R32", matchday: 4,
    dateISO: "2026-07-07", timeET: "19:00", city: "Monterrey",
    homeTeam: "3° mejor 3", awayTeam: "3° mejor 4", fifaId: "R32-14",
  },
  {
    stage: "R32", matchday: 4,
    dateISO: "2026-07-08", timeET: "15:00", city: "Filadelfia",
    homeTeam: "3° mejor 5", awayTeam: "3° mejor 6", fifaId: "R32-15",
  },
  {
    stage: "R32", matchday: 4,
    dateISO: "2026-07-08", timeET: "19:00", city: "Ciudad de México",
    homeTeam: "3° mejor 7", awayTeam: "3° mejor 8", fifaId: "R32-16",
  },

  // ─── R16 (Octavos de final) ────────────────────────────────────────────
  // Fechas estimadas: 11–14 julio 2026
  {
    stage: "R16", matchday: 1,
    dateISO: "2026-07-11", timeET: "15:00", city: "Dallas",
    homeTeam: "Ganador R32-01", awayTeam: "Ganador R32-02", fifaId: "R16-01",
  },
  {
    stage: "R16", matchday: 1,
    dateISO: "2026-07-11", timeET: "19:00", city: "Los Ángeles",
    homeTeam: "Ganador R32-03", awayTeam: "Ganador R32-04", fifaId: "R16-02",
  },
  {
    stage: "R16", matchday: 2,
    dateISO: "2026-07-12", timeET: "15:00", city: "Houston",
    homeTeam: "Ganador R32-05", awayTeam: "Ganador R32-06", fifaId: "R16-03",
  },
  {
    stage: "R16", matchday: 2,
    dateISO: "2026-07-12", timeET: "19:00", city: "Miami",
    homeTeam: "Ganador R32-07", awayTeam: "Ganador R32-08", fifaId: "R16-04",
  },
  {
    stage: "R16", matchday: 3,
    dateISO: "2026-07-13", timeET: "15:00", city: "Nueva York/Nueva Jersey",
    homeTeam: "Ganador R32-09", awayTeam: "Ganador R32-10", fifaId: "R16-05",
  },
  {
    stage: "R16", matchday: 3,
    dateISO: "2026-07-13", timeET: "19:00", city: "Seattle",
    homeTeam: "Ganador R32-11", awayTeam: "Ganador R32-12", fifaId: "R16-06",
  },
  {
    stage: "R16", matchday: 4,
    dateISO: "2026-07-14", timeET: "15:00", city: "Boston",
    homeTeam: "Ganador R32-13", awayTeam: "Ganador R32-14", fifaId: "R16-07",
  },
  {
    stage: "R16", matchday: 4,
    dateISO: "2026-07-14", timeET: "19:00", city: "San Francisco",
    homeTeam: "Ganador R32-15", awayTeam: "Ganador R32-16", fifaId: "R16-08",
  },

  // ─── QF (Cuartos de final) ─────────────────────────────────────────────
  // Fechas estimadas: 17–19 julio 2026
  {
    stage: "QF", matchday: 1,
    dateISO: "2026-07-17", timeET: "15:00", city: "Los Ángeles",
    homeTeam: "Ganador R16-01", awayTeam: "Ganador R16-02", fifaId: "QF-01",
  },
  {
    stage: "QF", matchday: 1,
    dateISO: "2026-07-17", timeET: "19:00", city: "Kansas City",
    homeTeam: "Ganador R16-03", awayTeam: "Ganador R16-04", fifaId: "QF-02",
  },
  {
    stage: "QF", matchday: 2,
    dateISO: "2026-07-18", timeET: "15:00", city: "Dallas",
    homeTeam: "Ganador R16-05", awayTeam: "Ganador R16-06", fifaId: "QF-03",
  },
  {
    stage: "QF", matchday: 2,
    dateISO: "2026-07-18", timeET: "19:00", city: "Atlanta",
    homeTeam: "Ganador R16-07", awayTeam: "Ganador R16-08", fifaId: "QF-04",
  },

  // ─── SF (Semifinales) ──────────────────────────────────────────────────
  // Fechas estimadas: 22–23 julio 2026
  {
    stage: "SF", matchday: 1,
    dateISO: "2026-07-22", timeET: "19:00", city: "Dallas",
    homeTeam: "Ganador QF-01", awayTeam: "Ganador QF-02", fifaId: "SF-01",
  },
  {
    stage: "SF", matchday: 2,
    dateISO: "2026-07-23", timeET: "19:00", city: "Nueva York/Nueva Jersey",
    homeTeam: "Ganador QF-03", awayTeam: "Ganador QF-04", fifaId: "SF-02",
  },

  // ─── Tercer puesto ────────────────────────────────────────────────────
  {
    stage: "TPP", matchday: 1,
    dateISO: "2026-07-25", timeET: "15:00", city: "Miami",
    homeTeam: "Perdedor SF-01", awayTeam: "Perdedor SF-02", fifaId: "TPP-01",
  },

  // ─── FINAL ────────────────────────────────────────────────────────────
  {
    stage: "FINAL", matchday: 1,
    dateISO: "2026-07-26", timeET: "18:00", city: "Nueva York/Nueva Jersey",
    homeTeam: "Ganador SF-01", awayTeam: "Ganador SF-02", fifaId: "FINAL-01",
  },
];

async function main() {
  for (const m of knockoutMatches) {
    const kickoffAt = etToUtcDate(m.dateISO, m.timeET);

    await prisma.match.upsert({
      where: { fifaId: m.fifaId },
      update: {
        kickoffAt,
        city: m.city,
        stage: m.stage,
        matchday: m.matchday,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
      },
      create: {
        fifaId: m.fifaId,
        stage: m.stage,
        group: null,
        matchday: m.matchday,
        city: m.city,
        kickoffAt,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
      },
    });
  }

  console.log(`✅ OK: ${knockoutMatches.length} partidos KO insertados/actualizados`);
  console.log("  Stages: R32 (16), R16 (8), QF (4), SF (2), TPP (1), FINAL (1)");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });