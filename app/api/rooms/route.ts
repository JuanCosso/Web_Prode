import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";
import { CreateRoomSchema } from "@/src/lib/validators";
import { nanoid } from "nanoid";
import { RoomRole } from "@prisma/client";


function roomCode() {
  return nanoid(6).toUpperCase();
}

export async function POST(req: Request) {
  const user = await getOrCreateUser();
  const body = await req.json().catch(() => ({}));
  const parsed = CreateRoomSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const code = roomCode();

  const room = await prisma.room.create({
    data: {
      code,
      name: parsed.data.name,
      editPolicy: parsed.data.editPolicy ?? "STRICT_PER_MATCH",
      members: { create: { userId: user.id, role: RoomRole.OWNER, contributionText: parsed.data.contributionText ?? "" } },
      auditLogs: {
        create: {
          action: "ROOM_CREATED",
          actorUserId: user.id,
        },
      },
    },
    select: { id: true, code: true, members:true, name: true, editPolicy: true },
  });

  return NextResponse.json({ room });
}
