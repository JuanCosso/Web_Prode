// src/lib/sse.ts
//
// Registro global de conexiones SSE activas por sala.
// Funciona en runtime Node.js (App Router). En deployments multi-instancia
// (e.g. Vercel con varias réplicas) el broadcast solo alcanza conexiones en
// la misma instancia — para la escala de una prode esto es aceptable.

type Controller = ReadableStreamDefaultController<Uint8Array>;

// Map: roomId → set de controllers activos
const roomConnections = new Map<string, Set<Controller>>();

// ─── Gestión de conexiones ────────────────────────────────────────────────────

export function addConnection(roomId: string, ctrl: Controller): void {
  if (!roomConnections.has(roomId)) roomConnections.set(roomId, new Set());
  roomConnections.get(roomId)!.add(ctrl);
}

export function removeConnection(roomId: string, ctrl: Controller): void {
  const set = roomConnections.get(roomId);
  if (!set) return;
  set.delete(ctrl);
  if (set.size === 0) roomConnections.delete(roomId);
}

/** Cantidad de conexiones activas (útil para debug / health). */
export function connectionCount(roomId?: string): number {
  if (roomId) return roomConnections.get(roomId)?.size ?? 0;
  let total = 0;
  for (const set of roomConnections.values()) total += set.size;
  return total;
}

// ─── Formato de mensajes ──────────────────────────────────────────────────────

export type SSEMessage =
  | { type: "preds"; payload: unknown[] }
  | { type: "match_update"; payload: unknown[] };

function encode(msg: SSEMessage): Uint8Array {
  return new TextEncoder().encode(`data: ${JSON.stringify(msg)}\n\n`);
}

function heartbeat(): Uint8Array {
  return new TextEncoder().encode(`: heartbeat\n\n`);
}

// ─── Broadcast ────────────────────────────────────────────────────────────────

function broadcast(roomId: string, msg: SSEMessage): void {
  const set = roomConnections.get(roomId);
  if (!set || set.size === 0) return;
  const chunk = encode(msg);
  const dead: Controller[] = [];
  for (const ctrl of set) {
    try {
      ctrl.enqueue(chunk);
    } catch {
      // El stream ya fue cerrado — marcar para limpiar
      dead.push(ctrl);
    }
  }
  for (const ctrl of dead) set.delete(ctrl);
  if (set.size === 0) roomConnections.delete(roomId);
}

/** Envía actualizaciones de predicciones a todos los clientes de la sala. */
export function broadcastPreds(roomId: string, payload: unknown[]): void {
  broadcast(roomId, { type: "preds", payload });
}

/**
 * Envía actualizaciones de resultados de partidos a TODAS las salas conectadas.
 * El cliente responde con router.refresh() para re-fetch de server data.
 */
export function broadcastMatchUpdate(payload: unknown[]): void {
  for (const roomId of roomConnections.keys()) {
    broadcast(roomId, { type: "match_update", payload });
  }
}

/** Envía heartbeat a todos los clientes de una sala (para mantener la conexión viva). */
export function sendHeartbeat(roomId: string): void {
  const set = roomConnections.get(roomId);
  if (!set || set.size === 0) return;
  const chunk = heartbeat();
  const dead: Controller[] = [];
  for (const ctrl of set) {
    try {
      ctrl.enqueue(chunk);
    } catch {
      dead.push(ctrl);
    }
  }
  for (const ctrl of dead) set.delete(ctrl);
  if (set.size === 0) roomConnections.delete(roomId);
}