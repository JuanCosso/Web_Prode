"use client";

import { useState } from "react";
import type { Member, PendingMember } from "./types";

export function PendingModal({
  pending,
  roomId,
  onApproved,
  onRejected,
  onClose,
}: {
  pending: PendingMember[];
  roomId: string;
  onApproved: (m: Member) => void;
  onRejected: (id: string) => void;
  onClose: () => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);

  async function approve(id: string) {
    setBusy(id);
    const res = await fetch(`/api/rooms/${roomId}/members/${id}/approve`, { method: "PATCH" });
    const data = await res.json();
    setBusy(null);
    if (res.ok) onApproved(data.member);
  }

  async function reject(id: string) {
    setBusy(id);
    await fetch(`/api/rooms/${roomId}/members/${id}/kick`, { method: "DELETE" });
    setBusy(null);
    onRejected(id);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Solicitudes pendientes</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-lg">✕</button>
        </div>
        {pending.length === 0 ? (
          <p className="text-sm text-white/50">No hay solicitudes pendientes.</p>
        ) : (
          pending.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 py-2 border-t border-white/10">
              <span className="text-sm font-medium">{p.displayName}</span>
              <div className="flex gap-2">
                <button
                  onClick={() => approve(p.id)}
                  disabled={busy === p.id}
                  className="rounded-lg bg-white text-slate-950 px-3 py-1 text-xs font-semibold hover:bg-white/90 disabled:opacity-50 transition"
                >
                  {busy === p.id ? "…" : "Aceptar"}
                </button>
                <button
                  onClick={() => reject(p.id)}
                  disabled={busy === p.id}
                  className="rounded-lg bg-white/10 border border-white/20 px-3 py-1 text-xs font-semibold hover:bg-red-600 hover:border-red-600 hover:text-white disabled:opacity-50 transition"
                >
                  {busy === p.id ? "…" : "Rechazar"}
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}