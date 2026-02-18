const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

function norm(input) {
  const displayName = String(input || "").trim().replace(/\s+/g, " ") || "Usuario";
  const keyBase = displayName
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^a-z0-9 ]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-") || "usuario";
  return { displayName, keyBase };
}

async function main() {
  const users = await prisma.user.findMany({
    where: { displayNameKey: null },
    select: { id: true, displayName: true },
  });

  for (const u of users) {
    const { displayName, keyBase } = norm(u.displayName);
    let key = keyBase;

    // aseguramos unicidad si ya existe
    for (let i = 0; i < 10; i++) {
      try {
        await prisma.user.update({
          where: { id: u.id },
          data: { displayName, displayNameKey: key },
        });
        break;
      } catch (e) {
        // P2002 => duplicado
        key = `${keyBase}-${u.id.slice(0, 4)}${i ? `-${i}` : ""}`;
      }
    }
  }

  console.log("OK backfill");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());
