"use client";

import type { Member, Me } from "./types";

export function MembersModal({
  members,
  me,
  isOwner,
  canKick,
  onChangeRole,
  onKick,
  onTransfer,
  onClose,
}: {
  members: Member[];
  me: Me;
  isOwner: boolean;
  canKick: boolean;
  onChangeRole: (id: string, role: "ADMIN" | "MEMBER") => void;
  onKick: (id: string, userId: string, name: string) => void;
  onTransfer: (id: string, userId: string, name: string) => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-slate-900 border border-white/15 rounded-2xl p-6 w-full max-w-sm shadow-2xl max-h-[80vh] flex flex-col">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Todos los jugadores ({members.length})</h2>
          <button onClick={onClose} className="text-white/50 hover:text-white text-lg">✕</button>
        </div>
        <div className="overflow-y-auto flex-1">
          {members.map((m) => {
            const isMe = m.userId === me.id;
            const isAdmin = m.role === "ADMIN" || m.role === "OWNER";
            const canRole = isOwner && !isMe && m.role !== "OWNER";
            const canKickThis = canKick && !isMe && m.role !== "OWNER";
            const canTransfer = isOwner && !isMe && m.role !== "OWNER";
            return (
              <div
                key={m.userId}
                className="flex items-center justify-between gap-3 py-2.5 border-b border-white/10 last:border-0"
              >
                <div className="flex items-center gap-2 min-w-0">
                  {isAdmin && (
                    <span className="text-sm shrink-0">
                      {m.role === "OWNER" ? "👑" : "⭐"}
                    </span>
                  )}
                  <span className={["text-sm font-medium truncate", isMe ? "text-white" : "text-white/80"].join(" ")}>
                    {m.displayName}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  {canRole && (
                    <button
                      onClick={() => onChangeRole(m.id, isAdmin ? "MEMBER" : "ADMIN")}
                      className="rounded-full border border-white/20 bg-white/10 px-2 py-0.5 text-[10px] text-white/60 hover:bg-white/20 hover:text-white transition"
                    >
                      {isAdmin ? "−Admin" : "+Admin"}
                    </button>
                  )}
                  {canTransfer && (
                    <button
                      onClick={() => { onTransfer(m.id, m.userId, m.displayName); onClose(); }}
                      className="rounded-full border border-yellow-500/30 bg-yellow-500/10 px-2 py-0.5 text-[10px] text-yellow-400 hover:bg-yellow-500/20 transition"
                      title="Transferir ownership"
                    >
                      👑
                    </button>
                  )}
                  {canKickThis && (
                    <button
                      onClick={() => { onKick(m.id, m.userId, m.displayName); onClose(); }}
                      className="rounded-full border border-red-500/30 bg-red-500/10 px-2 py-0.5 text-[10px] text-red-400 hover:bg-red-500/20 transition"
                    >
                      Expulsar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}