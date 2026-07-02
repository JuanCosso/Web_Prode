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

export async function PATCH(req: Request) {
  const me = await getCurrentUser();
  if (!me) return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
  if (!isAdmin(me.email)) return NextResponse.json({ error: "FORBIDDEN" }, { status: 403 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "INVALID_BODY" }, { status: 400 });

  const { matchId, kickoffAt, city } = body;
  if (!matchId) return NextResponse.json({ error: "MATCH_ID_REQUIRED" }, { status: 400 });

  try {
    const data: Record<string, any> = {};
    if (kickoffAt) data.kickoffAt = new Date(kickoffAt);
    if (city !== undefined) data.city = city.trim();

    const updated = await prisma.match.update({
      where: { id: matchId },
      data,
      select: {
        id: true,
        fifaId: true,
        stage: true,
        kickoffAt: true,
        city: true,
      },
    });

    return NextResponse.json({ ok: true, match: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Error updating schedule" }, { status: 500 });
  }
}
