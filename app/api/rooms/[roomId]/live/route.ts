// app/api/rooms/[roomId]/live/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth-user";
import { prisma } from "@/src/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    const { roomId } = await params;

    // 1. Autenticación
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    // 2. Verificar membresía activa usando tu tabla RoomMember
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: me.id } },
      select: { status: true },
    });
    
    if (!member || member.status !== "ACTIVE") {
      return NextResponse.json({ error: "NOT_A_MEMBER" }, { status: 403 });
    }

    // 3. Buscar las predicciones usando la estructura real de tu esquema
    const predictions = await prisma.prediction.findMany({
      where: {
        roomId: roomId
      },
      include: {
        user: true // Traemos el displayName desde el modelo User directamente
      }
    });

    // 4. Mapear los datos al formato exacto (LivePred) que devora el frontend
    const formattedPreds = predictions.map((p: any) => ({
      matchId: p.matchId,
      userId: p.userId,
      displayName: p.user?.displayName ?? "Usuario",
      h: p.predHomeGoals !== null ? String(p.predHomeGoals) : "",
      a: p.predAwayGoals !== null ? String(p.predAwayGoals) : "",
      penWinner: p.predPenWinner ?? null,
    }));

    // 5. Enviar respuesta limpia en JSON
    return NextResponse.json({
      type: "preds",
      payload: formattedPreds,
    });

  } catch (error) {
    console.error("Error en polling de predicciones:", error);
    return NextResponse.json(
      { error: "INTERNAL_SERVER_ERROR" },
      { status: 500 }
    );
  }
}