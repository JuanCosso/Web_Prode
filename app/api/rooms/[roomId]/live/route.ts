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

    // Auth
    const me = await getCurrentUser();
    if (!me) {
      return NextResponse.json({ error: "UNAUTHENTICATED" }, { status: 401 });
    }

    // Verificar membresía activa
    const member = await prisma.roomMember.findUnique({
      where: { roomId_userId: { roomId, userId: me.id } },
      select: { status: true },
    });
    
    if (!member || member.status !== "ACTIVE") {
      return NextResponse.json({ error: "NOT_A_MEMBER" }, { status: 403 });
    }

    // Buscar todas las predicciones de la sala
    const predictions = await prisma.prediction.findMany({
      where: {
        roomMember: { roomId }
      },
      include: {
        roomMember: {
          include: { user: true }
        }
      }
    });

    // Mapear al formato exacto (LivePred) que espera el frontend
    // Usamos 'any' en el parámetro para evitar errores de tipado estricto de TypeScript durante el build
    const formattedPreds = predictions.map((p: any) => ({
      matchId: p.matchId,
      userId: p.roomMember.userId,
      displayName: p.roomMember.user.displayName,
      h: p.predHomeGoals !== null ? String(p.predHomeGoals) : "",
      a: p.predAwayGoals !== null ? String(p.predAwayGoals) : "",
      penWinner: p.predPenWinner ?? null,
    }));

    // Retornar JSON puro (adiós SSE)
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