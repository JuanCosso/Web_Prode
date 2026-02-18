"use client";

import * as React from "react";
import { useRouter } from "next/navigation";

export function KickMemberButton({
  roomId,
  memberId,
  displayName,
}: {
  roomId: string;
  memberId: string;
  displayName: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = React.useState(false);

  async function onKick() {
    const ok = confirm(
      `Estás por eliminar a "${displayName}".\n\n` +
        `Va a perder TODOS sus puntos y predicciones en esta sala.\n` +
        `Esta acción NO se puede deshacer.\n\n` +
        `¿Confirmás?`
    );
    if (!ok) return;

    setLoading(true);
    try {
      const res = await fetch(`/api/rooms/${roomId}/members/${memberId}/kick`, {
        method: "DELETE",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "Error al eliminar");

      router.refresh(); // recarga datos server en App Router
    } catch (e: any) {
      alert(e?.message || "Error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <button
      type="button"
      disabled={loading}
      onClick={onKick}
      className="rounded-md bg-red-600 px-3 py-1.5 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-60"
    >
      {loading ? "Eliminando..." : "Eliminar"}
    </button>
  );
}
