import { prisma } from "@/src/lib/prisma";
import "./seed-group-stage";

async function main() {
  // Fixtures de ejemplo (reemplazás por el schedule real cuando lo integres)
  const now = new Date();
  const matches = [
    {
      stage: "GROUP",
      group: "A",
      matchday: 1,                          // ← faltaba
      city: "Buenos Aires",                 // ← faltaba
      kickoffAt: new Date(now.getTime() + 1000 * 60 * 60 * 24),
      homeTeam: "Argentina",
      awayTeam: "Canada",
    },
    {
      stage: "GROUP",
      group: "A",
      matchday: 2,                          // ← faltaba
      city: "Buenos Aires",                 // ← faltaba
      kickoffAt: new Date(now.getTime() + 1000 * 60 * 60 * 48),
      homeTeam: "Mexico",
      awayTeam: "USA",
    },
  ];

  for (const m of matches) {
    await prisma.match.create({ data: m });
  }

  console.log("Seed OK");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
