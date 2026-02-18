import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/src/lib/prisma";
import { getOrCreateUser } from "@/src/lib/user";
import { RoomRole, MembershipStatus } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: { roomId: string; memberId: string } }
) {
  const { roomId, memberId } = params;
  const body = await req.json().catch(() => ({}));
  const role = body?.role as RoomRole | undefined;

  // Validación de rol permitido
  if (role !== RoomRole.ADMIN && role !== RoomRole.MEMBER) {
    return NextResponse.json({ error: "INVALID_ROLE" }, { status: 400 });
  }

  const me = await getOrCreateUser();

  // Verificar que quien ejecuta es OWNER
  const myMember = await prisma.roomMember.findUnique({
    where: {
      roomId_userId: {
        roomId,
        userId: me.id,
      },
    },
    select: {
      role: true,
      status: true,
    },
  });

  if (!myMember || myMember.role !== RoomRole.OWNER) {
    return NextResponse.json({ error: "NOT_OWNER" }, { status: 403 });
  }

  // Buscar miembro objetivo
  const target = await prisma.roomMember.findUnique({
    where: { id: memberId },
    select: {
      id: true,
      roomId: true,
      role: true,
      status: true,
    },
  });

  if (!target || target.roomId !== roomId) {
    return NextResponse.json({ error: "MEMBER_NOT_FOUND" }, { status: 404 });
  }

  // No se puede modificar al OWNER
  if (target.role === RoomRole.OWNER) {
    return NextResponse.json({ error: "CANT_CHANGE_OWNER" }, { status: 403 });
  }

  // Solo se pueden modificar miembros activos
  if (target.status !== MembershipStatus.ACTIVE) {
    return NextResponse.json(
      { error: "CANT_CHANGE_PENDING_MEMBER" },
      { status: 403 }
    );
  }

  await prisma.roomMember.update({
    where: { id: target.id },
    data: { role },
  });

  return NextResponse.json({ ok: true });
}
