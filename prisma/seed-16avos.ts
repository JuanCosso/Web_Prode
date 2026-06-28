import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const partidos16avos = [
    { fifaId: 'R32-01', homeTeam: 'Sudáfrica', awayTeam: 'Canadá', kickoffAt: new Date('2026-06-28T16:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-02', homeTeam: 'Brasil', awayTeam: 'Japón', kickoffAt: new Date('2026-06-29T14:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-03', homeTeam: 'Alemania', awayTeam: 'Paraguay', kickoffAt: new Date('2026-06-29T17:30:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-04', homeTeam: 'Países Bajos', awayTeam: 'Marruecos', kickoffAt: new Date('2026-06-29T22:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-05', homeTeam: 'Costa de Marfil', awayTeam: 'Noruega', kickoffAt: new Date('2026-06-30T14:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-06', homeTeam: 'Francia', awayTeam: 'Suecia', kickoffAt: new Date('2026-06-30T18:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-07', homeTeam: 'México', awayTeam: 'Ecuador', kickoffAt: new Date('2026-06-30T22:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-08', homeTeam: 'Inglaterra', awayTeam: 'RD Congo', kickoffAt: new Date('2026-07-01T13:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-09', homeTeam: 'Bélgica', awayTeam: 'Senegal', kickoffAt: new Date('2026-07-01T17:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-10', homeTeam: 'Estados Unidos', awayTeam: 'Bosnia', kickoffAt: new Date('2026-07-01T21:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-11', homeTeam: 'España', awayTeam: 'Austria', kickoffAt: new Date('2026-07-02T16:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-12', homeTeam: 'Portugal', awayTeam: 'Croacia', kickoffAt: new Date('2026-07-02T20:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-13', homeTeam: 'Suiza', awayTeam: 'Argelia', kickoffAt: new Date('2026-07-03T00:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-14', homeTeam: 'Australia', awayTeam: 'Egipto', kickoffAt: new Date('2026-07-03T15:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-15', homeTeam: 'Argentina', awayTeam: 'Cabo Verde', kickoffAt: new Date('2026-07-03T19:00:00-03:00'), city: 'Miami', matchday: 1, stage: 'R32' },
    { fifaId: 'R32-16', homeTeam: 'Colombia', awayTeam: 'Ghana', kickoffAt: new Date('2026-07-03T22:30:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32' },
  ];

  console.log('Iniciando carga de 16avos de final...');

  for (const partido of partidos16avos) {
    await prisma.match.upsert({
      where: { fifaId: partido.fifaId },
      update: {
        stage: partido.stage,
        matchday: partido.matchday,
        kickoffAt: partido.kickoffAt,
        city: partido.city,
        homeTeam: partido.homeTeam,
        awayTeam: partido.awayTeam,
        group: null,
      },
      create: {
        fifaId: partido.fifaId,
        stage: partido.stage,
        matchday: partido.matchday,
        kickoffAt: partido.kickoffAt,
        city: partido.city,
        homeTeam: partido.homeTeam,
        awayTeam: partido.awayTeam,
        group: null,
      },
    });
  }

  console.log(`✅ OK: ${partidos16avos.length} partidos R32 insertados/actualizados`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });