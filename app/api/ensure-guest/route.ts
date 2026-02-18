import { NextResponse } from "next/server";
import { nanoid } from "nanoid";
import { prisma } from "@/src/lib/prisma";

const COOKIE_NAME = "prode_uid";

export async function GET() {
  const uid = nanoid(12);

  await prisma.user.create({
    data: {
      id: uid,
      displayName: `Usuario_${uid.slice(0, 6)}`,
    },
  });

  const response = NextResponse.redirect(new URL("/", process.env.NEXTAUTH_URL));

  response.cookies.set(COOKIE_NAME, uid, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
  });

  return response;
}
