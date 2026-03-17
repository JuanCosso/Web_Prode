import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Convierte fecha ISO + hora EDT (UTC-4, vigente en marzo 2026 por DST) a Date UTC
function edtToUtc(dateISO: string, timeET: string): Date {
  const [h, m] = timeET.split(":").map(Number);
  const [year, month, day] = dateISO.split("-").map(Number);
  // EDT = UTC-4
  return new Date(Date.UTC(year, month - 1, day, h + 4, m ?? 0));
}

const playoffMatches = [
  // ─── UEFA Playoff Semifinales — 26 de marzo 2026 ──────────────────────────
  // Path A
  {
    stage: "PO_SF", group: "UEFA-A", matchday: 1,
    dateISO: "2026-03-26", timeET: "15:45", city: "Roma",
    homeTeam: "Italia", awayTeam: "Irlanda del Norte",
    fifaId: "PO-UEFA-A-SF1",
    note: "Ganador → Grupo B (Canadá, Qatar, Suiza)",
  },
  {
    stage: "PO_SF", group: "UEFA-A", matchday: 1,
    dateISO: "2026-03-26", timeET: "15:45", city: "Cardiff",
    homeTeam: "Gales", awayTeam: "Bosnia",
    fifaId: "PO-UEFA-A-SF2",
    note: "Ganador → Grupo B (Canadá, Qatar, Suiza)",
  },
  // Path B
  {
    stage: "PO_SF", group: "UEFA-B", matchday: 1,
    dateISO: "2026-03-26", timeET: "13:00", city: "Estambul",
    homeTeam: "Turquía", awayTeam: "Rumania",
    fifaId: "PO-UEFA-B-SF1",
    note: "Ganador → Grupo F (Países Bajos, Japón, Túnez)",
  },
  {
    stage: "PO_SF", group: "UEFA-B", matchday: 1,
    dateISO: "2026-03-26", timeET: "15:45", city: "Bratislava",
    homeTeam: "Eslovaquia", awayTeam: "Kosovo",
    fifaId: "PO-UEFA-B-SF2",
    note: "Ganador → Grupo F (Países Bajos, Japón, Túnez)",
  },
  // Path C
  {
    stage: "PO_SF", group: "UEFA-C", matchday: 1,
    dateISO: "2026-03-26", timeET: "15:45", city: "Copenhague",
    homeTeam: "Dinamarca", awayTeam: "Macedonia",
    fifaId: "PO-UEFA-C-SF1",
    note: "Ganador → Grupo D (EE.UU., Paraguay, Australia)",
  },
  {
    stage: "PO_SF", group: "UEFA-C", matchday: 1,
    dateISO: "2026-03-26", timeET: "15:45", city: "Praga",
    homeTeam: "República Checa", awayTeam: "Irlanda",
    fifaId: "PO-UEFA-C-SF2",
    note: "Ganador → Grupo D (EE.UU., Paraguay, Australia)",
  },
  // Path D
  {
    stage: "PO_SF", group: "UEFA-D", matchday: 1,
    dateISO: "2026-03-26", timeET: "15:45", city: "Valencia",
    homeTeam: "Ucrania", awayTeam: "Suecia",
    fifaId: "PO-UEFA-D-SF1",
    note: "Ganador → Grupo A (México, Sudáfrica, Corea del Sur)",
  },
  {
    stage: "PO_SF", group: "UEFA-D", matchday: 1,
    dateISO: "2026-03-26", timeET: "15:45", city: "Varsovia",
    homeTeam: "Polonia", awayTeam: "Albania",
    fifaId: "PO-UEFA-D-SF2",
    note: "Ganador → Grupo A (México, Sudáfrica, Corea del Sur)",
  },
  // ─── Inter-confederation Semifinales — 26 de marzo 2026 ──────────────────
  {
    stage: "PO_SF", group: "INTER-1", matchday: 1,
    dateISO: "2026-03-26", timeET: "19:00", city: "Monterrey",
    homeTeam: "Bolivia", awayTeam: "Surinam",
    fifaId: "PO-INTER-1-SF",
    note: "Ganador enfrenta a Irak → winner va al Grupo I (Francia, Senegal, Noruega)",
  },
  {
    stage: "PO_SF", group: "INTER-2", matchday: 1,
    dateISO: "2026-03-27", timeET: "02:00", city: "Guadalajara",
    homeTeam: "Nueva Caledonia", awayTeam: "Jamaica",
    fifaId: "PO-INTER-2-SF",
    note: "Ganador enfrenta a DR Congo → winner va al Grupo K (Portugal, Uzbekistán, Colombia)",
  },

  // ─── UEFA Playoff Finales — 31 de marzo 2026 ─────────────────────────────
  {
    stage: "PO_F", group: "UEFA-A", matchday: 1,
    dateISO: "2026-03-31", timeET: "15:45", city: "por confirmar",
    homeTeam: "Ganador PO-UEFA-A-SF1", awayTeam: "Ganador PO-UEFA-A-SF2",
    fifaId: "PO-UEFA-A-F",
    note: "Ganador → Grupo B (Canadá, Qatar, Suiza) como 'Ganador Playoff UEFA A'",
  },
  {
    stage: "PO_F", group: "UEFA-B", matchday: 1,
    dateISO: "2026-03-31", timeET: "15:45", city: "por confirmar",
    homeTeam: "Ganador PO-UEFA-B-SF1", awayTeam: "Ganador PO-UEFA-B-SF2",
    fifaId: "PO-UEFA-B-F",
    note: "Ganador → Grupo F (Países Bajos, Japón, Túnez) como 'Ganador Playoff UEFA B'",
  },
  {
    stage: "PO_F", group: "UEFA-C", matchday: 1,
    dateISO: "2026-03-31", timeET: "15:45", city: "por confirmar",
    homeTeam: "Ganador PO-UEFA-C-SF1", awayTeam: "Ganador PO-UEFA-C-SF2",
    fifaId: "PO-UEFA-C-F",
    note: "Ganador → Grupo D (EE.UU., Paraguay, Australia) como 'Ganador Playoff UEFA C'",
  },
  {
    stage: "PO_F", group: "UEFA-D", matchday: 1,
    dateISO: "2026-03-31", timeET: "15:45", city: "por confirmar",
    homeTeam: "Ganador PO-UEFA-D-SF1", awayTeam: "Ganador PO-UEFA-D-SF2",
    fifaId: "PO-UEFA-D-F",
    note: "Ganador → Grupo A (México, Sudáfrica, Corea del Sur) como 'Ganador Playoff UEFA D'",
  },
  // ─── Inter-confederation Finales — 31 de marzo 2026 ──────────────────────
  {
    stage: "PO_F", group: "INTER-2", matchday: 1,
    dateISO: "2026-03-31", timeET: "17:00", city: "Guadalajara",
    homeTeam: "RD Congo", awayTeam: "Ganador PO-INTER-2-SF",
    fifaId: "PO-INTER-2-F",
    note: "Ganador → Grupo K (Portugal, Uzbekistán, Colombia) como 'Ganador Repechaje 1'",
  },
  {
    stage: "PO_F", group: "INTER-1", matchday: 1,
    dateISO: "2026-03-31", timeET: "19:00", city: "Monterrey",
    homeTeam: "Irak", awayTeam: "Ganador PO-INTER-1-SF",
    fifaId: "PO-INTER-1-F",
    note: "Ganador → Grupo I (Francia, Senegal, Noruega) como 'Ganador Repechaje 2'",
  },
];

async function main() {
  let inserted = 0;
  let skipped = 0;

  for (const m of playoffMatches) {
    const kickoffAt = edtToUtc(m.dateISO, m.timeET);

    await prisma.match.upsert({
      where: { fifaId: m.fifaId },
      update: {
        kickoffAt,
        city: m.city,
        stage: m.stage,
        group: m.group,
        matchday: m.matchday,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
      },
      create: {
        fifaId: m.fifaId,
        stage: m.stage,
        group: m.group,
        matchday: m.matchday,
        city: m.city,
        kickoffAt,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
      },
    });
    inserted++;
  }

  console.log(`✅ Playoffs: ${inserted} partidos insertados/actualizados`);
  console.log(`   UEFA SFs: 8 | UEFA Finals: 4 | Inter SFs: 2 | Inter Finals: 2`);
  console.log(`\nMapeado de ganadores a grupos del Mundial:`);
  console.log(`  PO-UEFA-A-F → Grupo B  (Ganador Playoff UEFA A)`);
  console.log(`  PO-UEFA-B-F → Grupo F  (Ganador Playoff UEFA B)`);
  console.log(`  PO-UEFA-C-F → Grupo D  (Ganador Playoff UEFA C)`);
  console.log(`  PO-UEFA-D-F → Grupo A  (Ganador Playoff UEFA D)`);
  console.log(`  PO-INTER-2-F → Grupo K (Ganador Repechaje 1)`);
  console.log(`  PO-INTER-1-F → Grupo I (Ganador Repechaje 2)`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());