import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  const partidos16avos = [
    { homeTeam: 'Sudáfrica', awayTeam: 'Canadá', kickoffAt: new Date('2026-06-28T16:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'Brasil', awayTeam: 'Japón', kickoffAt: new Date('2026-06-29T14:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'Alemania', awayTeam: 'Paraguay', kickoffAt: new Date('2026-06-29T17:30:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'Países Bajos', awayTeam: 'Marruecos', kickoffAt: new Date('2026-06-29T22:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'Costa de Marfil', awayTeam: 'Noruega', kickoffAt: new Date('2026-06-30T14:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'Francia', awayTeam: 'Suecia', kickoffAt: new Date('2026-06-30T18:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'México', awayTeam: 'A confirmar (3°)', kickoffAt: new Date('2026-06-30T22:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'A confirmar (1°L)', awayTeam: 'A confirmar (3°)', kickoffAt: new Date('2026-07-01T13:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'Bélgica', awayTeam: 'A confirmar (3°)', kickoffAt: new Date('2026-07-01T17:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'Estados Unidos', awayTeam: 'Bosnia y Herzegovina', kickoffAt: new Date('2026-07-01T21:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'España', awayTeam: 'A confirmar (2°J)', kickoffAt: new Date('2026-07-02T16:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'A confirmar (2°K)', awayTeam: 'A confirmar (2°L)', kickoffAt: new Date('2026-07-02T20:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'Suiza', awayTeam: 'A confirmar (3°)', kickoffAt: new Date('2026-07-03T00:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'Australia', awayTeam: 'Egipto', kickoffAt: new Date('2026-07-03T15:00:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'Argentina', awayTeam: 'Cabo Verde', kickoffAt: new Date('2026-07-03T19:00:00-03:00'), city: 'Miami', matchday: 1, stage: 'R32', status: 'PENDING' },
    { homeTeam: 'A confirmar (1°K)', awayTeam: 'A confirmar (3°)', kickoffAt: new Date('2026-07-03T22:30:00-03:00'), city: 'A confirmar', matchday: 1, stage: 'R32', status: 'PENDING' },
  ];

  console.log('Iniciando carga de 16avos de final...');
  for (const partido of partidos16avos) {
    await prisma.match.create({
      data: partido,
    });
  }
  console.log('¡16avos cargados correctamente en la base de datos!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });