import { NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";
import { RoomRole, MembershipStatus } from "@prisma/client";

export async function POST(
  req: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  const { roomId } = await params;

  const me = await getOrCreateUser();

  // Verificar que el caller es OWNER activo de esta sala
  const myMember = await prisma.roomMember.findUnique({
    where: { roomId_userId: { roomId, userId: me.id } },
    select: { id: true, role: true, status: true },
  });

  if (
    !myMember ||
    myMember.role !== RoomRole.OWNER ||
    myMember.status !== MembershipStatus.ACTIVE
  ) {
    return NextResponse.json({ error: "NOT_OWNER" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const { memberId } = body as { memberId?: string };

  if (!memberId || typeof memberId !== "string") {
    return NextResponse.json({ error: "MEMBER_ID_REQUIRED" }, { status: 400 });
  }

  // Buscar el miembro objetivo
  const target = await prisma.roomMember.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      roomId: true,
      userId: true,
      role: true,
      status: true,
    },
  });

  if (!target || target.roomId !== roomId) {
    return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });
  }

  // No tiene sentido transferirse a uno mismo
  if (target.userId === me.id) {
    return NextResponse.json({ error: "SAME_USER" }, { status: 400 });
  }

  // El target debe ser un miembro activo
  if (target.status !== MembershipStatus.ACTIVE) {
    return NextResponse.json(
      { error: "TARGET_NOT_ACTIVE" },
      { status: 400 }
    );
  }

  // Transacción atómica
  await prisma.$transaction([
    // 1. Owner actual → ADMIN
    prisma.roomMember.update({
      where: { id: myMember.id },
      data: { role: RoomRole.ADMIN },
    }),
    // 2. Target → OWNER
    prisma.roomMember.update({
      where: { id: target.id },
      data: { role: RoomRole.OWNER },
    }),
    // 3. Room.ownerId apunta al nuevo dueño
    prisma.room.update({
      where: { id: roomId },
      data: { ownerId: target.userId },
    }),
  ]);

  return NextResponse.json({
    ok: true,
    newOwnerId: target.userId,   // userId del nuevo owner (para actualizar UI)
    myNewRole: "ADMIN",
  });
}