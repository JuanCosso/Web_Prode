// app/api/rooms/[roomId]/live/route.ts
//
// GET /api/rooms/:roomId/live
// Abre un stream SSE. El cliente recibe:
//   - { type: "preds",        payload: LivePred[]   } cuando alguien guarda predicciones
//   - { type: "match_update", payload: MatchResult[] } cuando el admin carga resultados
//   - `: heartbeat` cada 25 s para mantener la conexión viva
//
// Al desconectarse (abort), el controller se elimina del registry.

import { NextRequest, NextResponse } from "next/server";
import { getCurrentUser } from "@/src/lib/auth-user";
import { prisma } from "@/src/lib/prisma";
import { addConnection, removeConnection } from "@/src/lib/sse";

export const runtime = "nodejs";
// Deshabilitar body parsing y buffering para SSE
export const dynamic = "force-dynamic";

const HEARTBEAT_INTERVAL_MS = 25_000;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ roomId: string }> }
) {
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

  // Crear ReadableStream y registrar el controller
  let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

  const stream = new ReadableStream<Uint8Array>({
    start(ctrl) {
      addConnection(roomId, ctrl);

      // Heartbeat periódico para mantener la conexión viva a través de proxies
      heartbeatTimer = setInterval(() => {
        try {
          ctrl.enqueue(new TextEncoder().encode(`: heartbeat\n\n`));
        } catch {
          // Stream cerrado — limpiar
          clearInterval(heartbeatTimer);
          removeConnection(roomId, ctrl);
        }
      }, HEARTBEAT_INTERVAL_MS);

      // Cleanup cuando el cliente se desconecta
      req.signal.addEventListener("abort", () => {
        clearInterval(heartbeatTimer);
        removeConnection(roomId, ctrl);
        try { ctrl.close(); } catch { /**/ }
      });
    },

    cancel() {
      clearInterval(heartbeatTimer);
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      "Connection": "keep-alive",
      // Deshabilitar buffering en Nginx/proxies
      "X-Accel-Buffering": "no",
    },
  });
}