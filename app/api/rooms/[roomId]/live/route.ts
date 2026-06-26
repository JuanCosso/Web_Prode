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

    // 2. Verificar membresía activa
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: me.id } },
      select: { status: true },
    });
    
    if (!member || member.status !== "ACTIVE") {
      return NextResponse.json({ error: "NOT_A_MEMBER" }, { status: 403 });
    }

    // 3. Buscar las predicciones
    const predictions = await prisma.prediction.findMany({
      where: {
        roomId: roomId
      },
      include: {
        user: true 
      }
    });

    // 4. Mapear sin forzar a String. Mantenemos los números intactos.
    const formattedPreds = predictions.map((p: any) => ({
      matchId: p.matchId,
      userId: p.userId,
      displayName: p.user?.displayName ?? "Usuario",
      h: p.predHomeGoals,
      a: p.predAwayGoals,
      penWinner: p.predPenWinner ?? null,
    }));

    // 5. Enviar respuesta
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