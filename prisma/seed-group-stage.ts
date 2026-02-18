import { PrismaClient } from "@prisma/client";
import { DateTime } from "luxon";

const prisma = new PrismaClient();

function etToUtcDate(dateISO: string, timeHHmm: string): Date {
  const dt = DateTime.fromISO(`${dateISO}T${timeHHmm}`, { zone: "America/New_York" });

  if (!dt.isValid) {
    throw new Error(
      `Fecha inválida: ${dateISO} ${timeHHmm} ET. Reason: ${dt.invalidReason ?? "unknown"} (${dt.invalidExplanation ?? ""})`
    );
  }

  return dt.toUTC().toJSDate();
}

type SeedMatch = {
  stage: "GROUP";
  group: string;
  matchday: 1 | 2 | 3;
  dateISO: string;
  timeET: string;
  city: string;
  homeTeam: string;
  awayTeam: string;
};

const matches: SeedMatch[] = [
  // Grupo A
  { stage:"GROUP", group:"A", matchday:1, dateISO:"2026-06-11", timeET:"15:00", city:"Ciudad de México", homeTeam:"México", awayTeam:"Sudáfrica" },
  { stage:"GROUP", group:"A", matchday:1, dateISO:"2026-06-11", timeET:"22:00", city:"Guadalajara", homeTeam:"Corea del Sur", awayTeam:"Ganador Playoff UEFA D" },
  { stage:"GROUP", group:"A", matchday:2, dateISO:"2026-06-18", timeET:"12:00", city:"Atlanta", homeTeam:"Ganador Playoff UEFA D", awayTeam:"Sudáfrica" },
  { stage:"GROUP", group:"A", matchday:2, dateISO:"2026-06-18", timeET:"21:00", city:"Guadalajara", homeTeam:"México", awayTeam:"Corea del Sur" },
  { stage:"GROUP", group:"A", matchday:3, dateISO:"2026-06-24", timeET:"21:00", city:"Ciudad de México", homeTeam:"Ganador Playoff UEFA D", awayTeam:"México" },
  { stage:"GROUP", group:"A", matchday:3, dateISO:"2026-06-24", timeET:"21:00", city:"Monterrey", homeTeam:"Sudáfrica", awayTeam:"Corea del Sur" },

  // Grupo B
  { stage:"GROUP", group:"B", matchday:1, dateISO:"2026-06-12", timeET:"15:00", city:"Toronto", homeTeam:"Canadá", awayTeam:"Ganador Playoff UEFA A" },
  { stage:"GROUP", group:"B", matchday:1, dateISO:"2026-06-13", timeET:"15:00", city:"San Francisco", homeTeam:"Qatar", awayTeam:"Suiza" },
  { stage:"GROUP", group:"B", matchday:2, dateISO:"2026-06-18", timeET:"15:00", city:"Los Ángeles", homeTeam:"Suiza", awayTeam:"Ganador Playoff UEFA A" },
  { stage:"GROUP", group:"B", matchday:2, dateISO:"2026-06-18", timeET:"18:00", city:"Vancouver", homeTeam:"Canadá", awayTeam:"Qatar" },
  { stage:"GROUP", group:"B", matchday:3, dateISO:"2026-06-24", timeET:"15:00", city:"Vancouver", homeTeam:"Suiza", awayTeam:"Canadá" },
  { stage:"GROUP", group:"B", matchday:3, dateISO:"2026-06-24", timeET:"15:00", city:"Seattle", homeTeam:"Ganador Playoff UEFA A", awayTeam:"Qatar" },

  // Grupo C
  { stage:"GROUP", group:"C", matchday:1, dateISO:"2026-06-13", timeET:"18:00", city:"Nueva York/Nueva Jersey", homeTeam:"Brasil", awayTeam:"Marruecos" },
  { stage:"GROUP", group:"C", matchday:1, dateISO:"2026-06-13", timeET:"21:00", city:"Boston", homeTeam:"Haití", awayTeam:"Escocia" },
  { stage:"GROUP", group:"C", matchday:2, dateISO:"2026-06-19", timeET:"18:00", city:"Boston", homeTeam:"Escocia", awayTeam:"Marruecos" },
  { stage:"GROUP", group:"C", matchday:2, dateISO:"2026-06-19", timeET:"21:00", city:"Filadelfia", homeTeam:"Brasil", awayTeam:"Haití" },
  { stage:"GROUP", group:"C", matchday:3, dateISO:"2026-06-24", timeET:"18:00", city:"Miami", homeTeam:"Escocia", awayTeam:"Brasil" },
  { stage:"GROUP", group:"C", matchday:3, dateISO:"2026-06-24", timeET:"18:00", city:"Atlanta", homeTeam:"Marruecos", awayTeam:"Haití" },

  // Grupo D
  { stage:"GROUP", group:"D", matchday:1, dateISO:"2026-06-12", timeET:"21:00", city:"Los Ángeles", homeTeam:"Estados Unidos", awayTeam:"Paraguay" },
  { stage:"GROUP", group:"D", matchday:1, dateISO:"2026-06-13", timeET:"00:00", city:"Vancouver", homeTeam:"Australia", awayTeam:"Ganador Playoff UEFA C" },
  { stage:"GROUP", group:"D", matchday:2, dateISO:"2026-06-19", timeET:"00:00", city:"San Francisco", homeTeam:"Ganador Playoff UEFA C", awayTeam:"Paraguay" },
  { stage:"GROUP", group:"D", matchday:2, dateISO:"2026-06-19", timeET:"15:00", city:"Seattle", homeTeam:"Estados Unidos", awayTeam:"Australia" },
  { stage:"GROUP", group:"D", matchday:3, dateISO:"2026-06-25", timeET:"22:00", city:"Los Ángeles", homeTeam:"Ganador Playoff UEFA C", awayTeam:"Estados Unidos" },
  { stage:"GROUP", group:"D", matchday:3, dateISO:"2026-06-25", timeET:"22:00", city:"San Francisco", homeTeam:"Paraguay", awayTeam:"Australia" },

  // Grupo E
  { stage:"GROUP", group:"E", matchday:1, dateISO:"2026-06-14", timeET:"13:00", city:"Houston", homeTeam:"Alemania", awayTeam:"Curazao" },
  { stage:"GROUP", group:"E", matchday:1, dateISO:"2026-06-14", timeET:"19:00", city:"Filadelfia", homeTeam:"Costa de Marfil", awayTeam:"Ecuador" },
  { stage:"GROUP", group:"E", matchday:2, dateISO:"2026-06-20", timeET:"16:00", city:"Toronto", homeTeam:"Alemania", awayTeam:"Costa de Marfil" },
  { stage:"GROUP", group:"E", matchday:2, dateISO:"2026-06-20", timeET:"20:00", city:"Kansas City", homeTeam:"Ecuador", awayTeam:"Curazao" },
  { stage:"GROUP", group:"E", matchday:3, dateISO:"2026-06-25", timeET:"16:00", city:"Nueva York/Nueva Jersey", homeTeam:"Ecuador", awayTeam:"Alemania" },
  { stage:"GROUP", group:"E", matchday:3, dateISO:"2026-06-25", timeET:"16:00", city:"Filadelfia", homeTeam:"Curazao", awayTeam:"Costa de Marfil" },

  // Grupo F
  { stage:"GROUP", group:"F", matchday:1, dateISO:"2026-06-14", timeET:"16:00", city:"Dallas", homeTeam:"Países Bajos", awayTeam:"Japón" },
  { stage:"GROUP", group:"F", matchday:1, dateISO:"2026-06-14", timeET:"22:00", city:"Monterrey", homeTeam:"Ganador Playoff UEFA B", awayTeam:"Túnez" },
  { stage:"GROUP", group:"F", matchday:2, dateISO:"2026-06-20", timeET:"13:00", city:"Houston", homeTeam:"Países Bajos", awayTeam:"Ganador Playoff UEFA B" },
  { stage:"GROUP", group:"F", matchday:2, dateISO:"2026-06-20", timeET:"00:00", city:"(por confirmar)", homeTeam:"Túnez", awayTeam:"Japón" },
  { stage:"GROUP", group:"F", matchday:3, dateISO:"2026-06-25", timeET:"19:00", city:"Dallas", homeTeam:"Japón", awayTeam:"Ganador Playoff UEFA B" },
  { stage:"GROUP", group:"F", matchday:3, dateISO:"2026-06-25", timeET:"19:00", city:"Kansas City", homeTeam:"Túnez", awayTeam:"Países Bajos" },

  // Grupo G
  { stage:"GROUP", group:"G", matchday:1, dateISO:"2026-06-15", timeET:"21:00", city:"Los Ángeles", homeTeam:"Irán", awayTeam:"Nueva Zelanda" },
  { stage:"GROUP", group:"G", matchday:1, dateISO:"2026-06-15", timeET:"15:00", city:"Seattle", homeTeam:"Bélgica", awayTeam:"Egipto" },
  { stage:"GROUP", group:"G", matchday:2, dateISO:"2026-06-21", timeET:"15:00", city:"Los Ángeles", homeTeam:"Bélgica", awayTeam:"Irán" },
  { stage:"GROUP", group:"G", matchday:2, dateISO:"2026-06-21", timeET:"21:00", city:"Vancouver", homeTeam:"Nueva Zelanda", awayTeam:"Egipto" },
  { stage:"GROUP", group:"G", matchday:3, dateISO:"2026-06-26", timeET:"23:00", city:"Seattle", homeTeam:"Egipto", awayTeam:"Irán" },
  { stage:"GROUP", group:"G", matchday:3, dateISO:"2026-06-26", timeET:"23:00", city:"Vancouver", homeTeam:"Nueva Zelanda", awayTeam:"Bélgica" },

  // Grupo H
  { stage:"GROUP", group:"H", matchday:1, dateISO:"2026-06-15", timeET:"12:00", city:"Atlanta", homeTeam:"España", awayTeam:"Cabo Verde" },
  { stage:"GROUP", group:"H", matchday:1, dateISO:"2026-06-15", timeET:"18:00", city:"Miami", homeTeam:"Arabia Saudita", awayTeam:"Uruguay" },
  { stage:"GROUP", group:"H", matchday:2, dateISO:"2026-06-21", timeET:"12:00", city:"Atlanta", homeTeam:"España", awayTeam:"Arabia Saudita" },
  { stage:"GROUP", group:"H", matchday:2, dateISO:"2026-06-21", timeET:"18:00", city:"Miami", homeTeam:"Uruguay", awayTeam:"Cabo Verde" },
  { stage:"GROUP", group:"H", matchday:3, dateISO:"2026-06-26", timeET:"20:00", city:"Houston", homeTeam:"Cabo Verde", awayTeam:"Arabia Saudita" },
  { stage:"GROUP", group:"H", matchday:3, dateISO:"2026-06-26", timeET:"20:00", city:"Guadalajara", homeTeam:"Uruguay", awayTeam:"España" },

  // Grupo I
  { stage:"GROUP", group:"I", matchday:1, dateISO:"2026-06-16", timeET:"15:00", city:"Nueva York/Nueva Jersey", homeTeam:"Francia", awayTeam:"Senegal" },
  { stage:"GROUP", group:"I", matchday:1, dateISO:"2026-06-16", timeET:"18:00", city:"Boston", homeTeam:"Ganador Repechaje 1", awayTeam:"Noruega" },
  { stage:"GROUP", group:"I", matchday:2, dateISO:"2026-06-22", timeET:"17:00", city:"Filadelfia", homeTeam:"Francia", awayTeam:"Ganador Repechaje 1" },
  { stage:"GROUP", group:"I", matchday:2, dateISO:"2026-06-22", timeET:"20:00", city:"Nueva York/Nueva Jersey", homeTeam:"Noruega", awayTeam:"Senegal" },
  { stage:"GROUP", group:"I", matchday:3, dateISO:"2026-06-26", timeET:"15:00", city:"Boston", homeTeam:"Noruega", awayTeam:"Francia" },
  { stage:"GROUP", group:"I", matchday:3, dateISO:"2026-06-26", timeET:"15:00", city:"Toronto", homeTeam:"Senegal", awayTeam:"Ganador Repechaje 1" },

  // Grupo J
  { stage:"GROUP", group:"J", matchday:1, dateISO:"2026-06-16", timeET:"21:00", city:"Kansas City", homeTeam:"Argentina", awayTeam:"Argelia" },
  { stage:"GROUP", group:"J", matchday:1, dateISO:"2026-06-16", timeET:"00:00", city:"San Francisco", homeTeam:"Austria", awayTeam:"Jordania" },
  { stage:"GROUP", group:"J", matchday:2, dateISO:"2026-06-22", timeET:"13:00", city:"Dallas", homeTeam:"Argentina", awayTeam:"Austria" },
  { stage:"GROUP", group:"J", matchday:2, dateISO:"2026-06-22", timeET:"23:00", city:"San Francisco", homeTeam:"Jordania", awayTeam:"Argelia" },
  { stage:"GROUP", group:"J", matchday:3, dateISO:"2026-06-27", timeET:"22:00", city:"Kansas City", homeTeam:"Argelia", awayTeam:"Austria" },
  { stage:"GROUP", group:"J", matchday:3, dateISO:"2026-06-27", timeET:"22:00", city:"Dallas", homeTeam:"Jordania", awayTeam:"Argentina" },

  // Grupo K
  { stage:"GROUP", group:"K", matchday:1, dateISO:"2026-06-17", timeET:"13:00", city:"Houston", homeTeam:"Portugal", awayTeam:"Ganador repechaje 2" },
  { stage:"GROUP", group:"K", matchday:1, dateISO:"2026-06-17", timeET:"22:00", city:"Ciudad de México", homeTeam:"Uzbekistán", awayTeam:"Colombia" },
  { stage:"GROUP", group:"K", matchday:2, dateISO:"2026-06-23", timeET:"13:00", city:"Houston", homeTeam:"Portugal", awayTeam:"Uzbekistán" },
  { stage:"GROUP", group:"K", matchday:2, dateISO:"2026-06-23", timeET:"22:00", city:"Guadalajara", homeTeam:"Colombia", awayTeam:"Ganador repechaje 2" },
  { stage:"GROUP", group:"K", matchday:3, dateISO:"2026-06-27", timeET:"19:30", city:"Miami", homeTeam:"Colombia", awayTeam:"Portugal" },
  { stage:"GROUP", group:"K", matchday:3, dateISO:"2026-06-27", timeET:"19:30", city:"Atlanta", homeTeam:"Ganador repechaje 2", awayTeam:"Uzbekistán" },

  // Grupo L
  { stage:"GROUP", group:"L", matchday:1, dateISO:"2026-06-17", timeET:"16:00", city:"Dallas", homeTeam:"Inglaterra", awayTeam:"Croacia" },
  { stage:"GROUP", group:"L", matchday:1, dateISO:"2026-06-17", timeET:"19:00", city:"Toronto", homeTeam:"Ghana", awayTeam:"Panamá" },
  { stage:"GROUP", group:"L", matchday:2, dateISO:"2026-06-23", timeET:"16:00", city:"Boston", homeTeam:"Inglaterra", awayTeam:"Ghana" },
  { stage:"GROUP", group:"L", matchday:2, dateISO:"2026-06-23", timeET:"19:00", city:"Toronto", homeTeam:"Panamá", awayTeam:"Croacia" },
  { stage:"GROUP", group:"L", matchday:3, dateISO:"2026-06-27", timeET:"17:00", city:"Nueva York/Nueva Jersey", homeTeam:"Panamá", awayTeam:"Inglaterra" },
  { stage:"GROUP", group:"L", matchday:3, dateISO:"2026-06-27", timeET:"17:00", city:"Filadelfia", homeTeam:"Croacia", awayTeam:"Ghana" },
];

async function main() {
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];

    const kickoffAt = etToUtcDate(m.dateISO, m.timeET);
    const fifaId = `GROUP-${m.group}-MD${m.matchday}-${String(i + 1).padStart(2, "0")}`;

    await prisma.match.upsert({
      where: { fifaId },
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
        fifaId,
        stage: m.stage,
        group: m.group,
        matchday: m.matchday,
        city: m.city,
        kickoffAt,
        homeTeam: m.homeTeam,
        awayTeam: m.awayTeam,
      },
    });
  }

  console.log(`OK: ${matches.length} partidos de fase de grupos`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });