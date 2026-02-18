import { getServerSession } from "next-auth";
import { authOptions } from "@/auth";
import { cookies } from "next/headers";
import { prisma } from "@/src/lib/prisma";

const COOKIE_NAME = "prode_uid";

export async function getCurrentUser() {
  const session = await getServerSession(authOptions);

  // 1️⃣ Google
  if (session?.user?.id) {
    return prisma.user.findUnique({
      where: { id: session.user.id },
    });
  }

  // 2️⃣ Guest por cookie (solo leer)
  const store = await cookies();
  const uid = store.get(COOKIE_NAME)?.value;

  if (!uid) return null;

  return prisma.user.findUnique({
    where: { id: uid },
  });
}
