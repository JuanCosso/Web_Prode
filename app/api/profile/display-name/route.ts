import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";
import { parseDisplayName } from "@/src/lib/displayName";

export async function PATCH(req: Request) {
  const me = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));

  const raw = String(body?.displayName ?? "");
  const parsed = parseDisplayName(raw);

  if (!parsed.ok) {
    return NextResponse.json(
      { error: parsed.error, message: parsed.message },
      { status: 400 }
    );
  }

  try {
    await prisma.user.update({
      where: { id: me.id },
      data: { displayName: parsed.displayName},
    });
  } catch (e: any) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      return NextResponse.json(
        { error: "NAME_TAKEN", message: "Ese nombre ya está en uso." },
        { status: 409 }
      );
    }
    throw e;
  }

  return NextResponse.json({ ok: true, displayName: parsed.displayName });
}
