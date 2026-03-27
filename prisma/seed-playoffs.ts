// prisma/seed-playoffs.ts

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// EDT = UTC-4 (DST vigente en marzo 2026)
function edtToUtc(dateISO: string, timeET: string): Date {
  const [h, m] = timeET.split(":").map(Number);
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, h + 4, m ?? 0));
}

// CET = UTC+1 (Europa en marzo)
function cetToUtc(dateISO: string, timeCET: string): Date {
  const [h, m] = timeCET.split(":").map(Number);
  const [year, month, day] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, h - 1, m ?? 0));
}

const playoffMatches = [
  // ── UEFA PLAYOFF SEMIFINALES (26 mar 2026) ────────────────────────────────
  // Path A → Grupo B (Canadá, Qatar, Suiza)
  { stage:"PO_SF", group:"UEFA-A", matchday:1, date:"2026-03-26", time:"20:45", tz:"CET", city:"Roma",        homeTeam:"Italia",           awayTeam:"Irlanda del Norte",  fifaId:"PO-UEFA-A-SF1" },
  { stage:"PO_SF", group:"UEFA-A", matchday:2, date:"2026-03-26", time:"20:45", tz:"CET", city:"Cardiff",     homeTeam:"Gales",             awayTeam:"Bosnia", fifaId:"PO-UEFA-A-SF2" },
  // Path B → Grupo F (Países Bajos, Japón, Túnez)
  { stage:"PO_SF", group:"UEFA-B", matchday:1, date:"2026-03-26", time:"18:00", tz:"CET", city:"Estambul",    homeTeam:"Turquía",           awayTeam:"Rumania",            fifaId:"PO-UEFA-B-SF1" },
  { stage:"PO_SF", group:"UEFA-B", matchday:2, date:"2026-03-26", time:"20:45", tz:"CET", city:"Bratislava",  homeTeam:"Eslovaquia",        awayTeam:"Kosovo",             fifaId:"PO-UEFA-B-SF2" },
  // Path C → Grupo D (EE.UU., Paraguay, Australia)
  { stage:"PO_SF", group:"UEFA-C", matchday:1, date:"2026-03-26", time:"20:45", tz:"CET", city:"Copenhague",  homeTeam:"Dinamarca",         awayTeam:"Macedonia", fifaId:"PO-UEFA-C-SF1" },
  { stage:"PO_SF", group:"UEFA-C", matchday:2, date:"2026-03-26", time:"20:45", tz:"CET", city:"Praga",       homeTeam:"República Checa",   awayTeam:"Irlanda", fifaId:"PO-UEFA-C-SF2" },
  // Path D → Grupo A (México, Sudáfrica, Corea del Sur)
  { stage:"PO_SF", group:"UEFA-D", matchday:1, date:"2026-03-26", time:"20:45", tz:"CET", city:"por confirmar", homeTeam:"Ucrania",         awayTeam:"Suecia",             fifaId:"PO-UEFA-D-SF1" },
  { stage:"PO_SF", group:"UEFA-D", matchday:2, date:"2026-03-26", time:"20:45", tz:"CET", city:"Varsovia",    homeTeam:"Polonia",           awayTeam:"Albania",            fifaId:"PO-UEFA-D-SF2" },

  // ── INTER-CONFEDERATION SEMIFINALES (26-27 mar 2026) ─────────────────────
  { stage:"PO_SF", group:"INTER-1", matchday:1, date:"2026-03-26", time:"20:00", tz:"EDT", city:"Monterrey",  homeTeam:"Bolivia",          awayTeam:"Surinam",            fifaId:"PO-INTER-1-SF" },
  { stage:"PO_SF", group:"INTER-2", matchday:1, date:"2026-03-27", time:"02:00", tz:"EDT", city:"Guadalajara", homeTeam:"Nueva Caledonia", awayTeam:"Jamaica",            fifaId:"PO-INTER-2-SF" },

  // ── UEFA PLAYOFF FINALES (31 mar 2026) — nombres abreviados ──────────────
  // Formato: ABR1/ABR2 — indica los dos posibles clasificados
  { stage:"PO_F", group:"UEFA-A", matchday:1, date:"2026-03-31", time:"20:45", tz:"CET", city:"por confirmar", homeTeam:"Italia",  awayTeam:"Bosnia",  fifaId:"PO-UEFA-A-F" },
  { stage:"PO_F", group:"UEFA-B", matchday:1, date:"2026-03-31", time:"20:45", tz:"CET", city:"por confirmar", homeTeam:"Turquía",  awayTeam:"Kosovo",  fifaId:"PO-UEFA-B-F" },
  { stage:"PO_F", group:"UEFA-C", matchday:1, date:"2026-03-31", time:"20:45", tz:"CET", city:"por confirmar", homeTeam:"Dinamarca",  awayTeam:"República Checa",  fifaId:"PO-UEFA-C-F" },
  { stage:"PO_F", group:"UEFA-D", matchday:1, date:"2026-03-31", time:"20:45", tz:"CET", city:"por confirmar", homeTeam:"Suecia",  awayTeam:"Polonia",  fifaId:"PO-UEFA-D-F" },

  // ── INTER-CONFEDERATION FINALES (31 mar 2026) ─────────────────────────────
  { stage:"PO_F", group:"INTER-2", matchday:1, date:"2026-03-31", time:"18:00", tz:"EDT", city:"Guadalajara", homeTeam:"RD Congo", awayTeam:"NCL/JAM", fifaId:"PO-INTER-2-F" },
  { stage:"PO_F", group:"INTER-1", matchday:1, date:"2026-03-31", time:"20:00", tz:"EDT", city:"Monterrey",   homeTeam:"Irak",       awayTeam:"Bolivia", fifaId:"PO-INTER-1-F" },
];

async function main() {
  let count = 0;
  for (const m of playoffMatches) {
    const kickoffAt = m.tz === "CET" ? cetToUtc(m.date, m.time) : edtToUtc(m.date, m.time);
    await prisma.match.upsert({
      where: { fifaId: m.fifaId },
      update: { kickoffAt, city: m.city, stage: m.stage, group: m.group, matchday: m.matchday, homeTeam: m.homeTeam, awayTeam: m.awayTeam },
      create: { fifaId: m.fifaId, stage: m.stage, group: m.group, matchday: m.matchday, city: m.city, kickoffAt, homeTeam: m.homeTeam, awayTeam: m.awayTeam },
    });
    count++;
  }
  console.log(`✅ ${count} partidos de repechaje insertados/actualizados`);
  console.log(`\n  PO_SF: 10 partidos | PO_F: 6 partidos`);
  console.log(`\n  UEFA-A: ITA/NIR vs GAL/BIH  → Grupo B`);
  console.log(`  UEFA-B: TUR/RUM vs SVK/KOS  → Grupo F`);
  console.log(`  UEFA-C: DIN/MKD vs CHE/IRL  → Grupo D`);
  console.log(`  UEFA-D: UCR/SUE vs POL/ALB  → Grupo A`);
  console.log(`  INTER-2: R.D.Congo vs NCL/JAM → Grupo K`);
  console.log(`  INTER-1: Irak vs BOL/SUR      → Grupo I`);
}

main().catch((e) => { console.error(e); process.exit(1); }).finally(() => prisma.$disconnect());