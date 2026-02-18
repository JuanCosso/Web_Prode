import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/src/lib/prisma";

const COOKIE_NAME = "prode_uid";

export async function GET() {
  const store = await cookies();
  const guestId = store.get(COOKIE_NAME)?.value;

  if (!guestId) {
    return NextResponse.json({ hasData: false });
  }

  const [membership, prediction] = await Promise.all([
    prisma.roomMember.findFirst({
      where: { userId: guestId },
      select: { id: true },
    }),
    prisma.prediction.findFirst({
      where: { userId: guestId },
      select: { id: true },
    }),
  ]);

  const hasData = !!membership || !!prediction;

  return NextResponse.json({ hasData });
}
