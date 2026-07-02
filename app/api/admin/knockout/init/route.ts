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

const KNOCKOUT_TEMPLATE = [
  { fifaId: "R32-01", stage: "R32", matchday: 1, city: "Miami", kickoffAt: new Date("2026-07-01T19:00:00Z") },
  { fifaId: "R32-02", stage: "R32", matchday: 1, city: "Los Ángeles", kickoffAt: new Date("2026-07-01T23:00:00Z") },
  { fifaId: "R32-03", stage: "R32", matchday: 1, city: "Nueva York/Nueva Jersey", kickoffAt: new Date("2026-07-02T19:00:00Z") },
  { fifaId: "R32-04", stage: "R32", matchday: 1, city: "Dallas", kickoffAt: new Date("2026-07-02T23:00:00Z") },
  { fifaId: "R32-05", stage: "R32", matchday: 2, city: "Houston", kickoffAt: new Date("2026-07-03T19:00:00Z") },
  { fifaId: "R32-06", stage: "R32", matchday: 2, city: "Seattle", kickoffAt: new Date("2026-07-03T23:00:00Z") },
  { fifaId: "R32-07", stage: "R32", matchday: 2, city: "San Francisco", kickoffAt: new Date("2026-07-04T19:00:00Z") },
  { fifaId: "R32-08", stage: "R32", matchday: 2, city: "Boston", kickoffAt: new Date("2026-07-04T23:00:00Z") },
  { fifaId: "R32-09", stage: "R32", matchday: 3, city: "Atlanta", kickoffAt: new Date("2026-07-05T19:00:00Z") },
  { fifaId: "R32-10", stage: "R32", matchday: 3, city: "Kansas City", kickoffAt: new Date("2026-07-05T23:00:00Z") },
  { fifaId: "R32-11", stage: "R32", matchday: 3, city: "Vancouver", kickoffAt: new Date("2026-07-06T19:00:00Z") },
  { fifaId: "R32-12", stage: "R32", matchday: 3, city: "Guadalajara", kickoffAt: new Date("2026-07-06T23:00:00Z") },
  { fifaId: "R32-13", stage: "R32", matchday: 4, city: "Toronto", kickoffAt: new Date("2026-07-07T19:00:00Z") },
  { fifaId: "R32-14", stage: "R32", matchday: 4, city: "Monterrey", kickoffAt: new Date("2026-07-07T23:00:00Z") },
  { fifaId: "R32-15", stage: "R32", matchday: 4, city: "Filadelfia", kickoffAt: new Date("2026-07-08T19:00:00Z") },
  { fifaId: "R32-16", stage: "R32", matchday: 4, city: "Ciudad de México", kickoffAt: new Date("2026-07-08T23:00:00Z") },
  { fifaId: "R16-01", stage: "R16", matchday: 1, city: "Dallas", kickoffAt: new Date("2026-07-11T19:00:00Z") },
  { fifaId: "R16-02", stage: "R16", matchday: 1, city: "Los Ángeles", kickoffAt: new Date("2026-07-11T23:00:00Z") },
  { fifaId: "R16-03", stage: "R16", matchday: 2, city: "Houston", kickoffAt: new Date("2026-07-12T19:00:00Z") },
  { fifaId: "R16-04", stage: "R16", matchday: 2, city: "Miami", kickoffAt: new Date("2026-07-12T23:00:00Z") },
  { fifaId: "R16-05", stage: "R16", matchday: 3, city: "Nueva York/Nueva Jersey", kickoffAt: new Date("2026-07-13T19:00:00Z") },
  { fifaId: "R16-06", stage: "R16", matchday: 3, city: "Seattle", kickoffAt: new Date("2026-07-13T23:00:00Z") },
  { fifaId: "R16-07", stage: "R16", matchday: 4, city: "Boston", kickoffAt: new Date("2026-07-14T19:00:00Z") },
  { fifaId: "R16-08", stage: "R16", matchday: 4, city: "San Francisco", kickoffAt: new Date("2026-07-14T23:00:00Z") },
  { fifaId: "QF-01", stage: "QF", matchday: 1, city: "Los Ángeles", kickoffAt: new Date("2026-07-17T19:00:00Z") },
  { fifaId: "QF-02", stage: "QF", matchday: 1, city: "Kansas City", kickoffAt: new Date("2026-07-17T23:00:00Z") },
  { fifaId: "QF-03", stage: "QF", matchday: 2, city: "Dallas", kickoffAt: new Date("2026-07-18T19:00:00Z") },
  { fifaId: "QF-04", stage: "QF", matchday: 2, city: "Atlanta", kickoffAt: new Date("2026-07-18T23:00:00Z") },
  { fifaId: "SF-01", stage: "SF", matchday: 1, city: "Dallas", kickoffAt: new Date("2026-07-22T23:00:00Z") },
  { fifaId: "SF-02", stage: "SF", matchday: 2, city: "Nueva York/Nueva Jersey", kickoffAt: new Date("2026-07-23T23:00:00Z") },
  { fifaId: "TPP-01", stage: "TPP", matchday: 1, city: "Miami", kickoffAt: new Date("2026-07-25T19:00:00Z") },
  { fifaId: "FINAL-01", stage: "FINAL", matchday: 1, city: "Nueva York/Nueva Jersey", kickoffAt: new Date("2026-07-26T22:00:00Z") },
];

export async function POST() {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  if (!isAdmin(me.email)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  try {
    let count = 0;
    for (const m of KNOCKOUT_TEMPLATE) {
      await prisma.match.upsert({
        where: { fifaId: m.fifaId },
        update: { city: m.city, kickoffAt: m.kickoffAt, stage: m.stage, matchday: m.matchday },
        create: {
          fifaId: m.fifaId,
          stage: m.stage,
          group: null,
          matchday: m.matchday,
          city: m.city,
          kickoffAt: m.kickoffAt,
          homeTeam: m.stage === "R32" ? `1° Grupo ${String.fromCharCode(65 + Math.floor((count % 16) / 2))}` : `Ganador ${m.fifaId}`,
          awayTeam: m.stage === "R32" ? `2° Grupo ${String.fromCharCode(65 + Math.floor((count % 16) / 2))}` : `Ganador ${m.fifaId}`,
        },
      });
      count++;
    }
    return NextResponse.json({ ok: true, count });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error creating bracket" }, { status: 500 });
  }
}
