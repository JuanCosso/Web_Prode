import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { nanoid } from "nanoid";
import { prisma } from "@/src/lib/prisma";

const COOKIE_NAME = "prode_uid";

export async function POST() {
  const store = await cookies();
  let uid = store.get(COOKIE_NAME)?.value;

  if (!uid) {
    uid = nanoid(12);

    await prisma.user.create({
      data: {
        id: uid,
        displayName: `Usuario_${uid.slice(0, 6)}`,
      },
    });

    const response = NextResponse.json({ ok: true });

    response.cookies.set(COOKIE_NAME, uid, {
      httpOnly: true,
      sameSite: "lax",
      path: "/",
    });

    return response;
  }

  return NextResponse.json({ ok: true });
}
