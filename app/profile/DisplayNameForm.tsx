"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function DisplayNameForm({ initialName }: { initialName: string }) {
  const router = useRouter();
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function save() {
    setSaving(true);
    setMsg(null);

    const res = await fetch("/api/profile/display-name", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ displayName: name }),
    });
    const data = await res.json().catch(() => ({}));

    setSaving(false);

    if (res.status === 409 && data?.error === "NAME_TAKEN") {
      setMsg("Ese nombre ya está en uso. Elegí otro.");
      return;
    }
    if (!res.ok) {
      switch (data?.error) {
        case "EMPTY":
          setMsg("El nombre no puede estar vacío.");
          break;
    
        case "LENGTH":
          setMsg("Debe tener entre 3 y 25 caracteres.");
          break;
    
        case "SPACES":
          setMsg("No se permiten espacios al inicio/fin ni espacios dobles.");
          break;
    
        case "CHARS":
          setMsg("Solo letras, números y un espacio simple.");
          break;
    
        case "RESERVED":
          setMsg("Ese nombre está reservado.");
          break;
    
        case "NAME_TAKEN":
          setMsg("Ese nombre ya está en uso.");
          break;
    
        default:
          setMsg("Error al actualizar el nombre.");
      }
      return;
    }        

    setMsg("Nombre actualizado ✅");
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-white/12 bg-white/8 p-4">
      <div className="text-sm font-semibold">Nombre de usuario</div>

      <input
        className="mt-2 w-full rounded-xl border border-white/15 bg-black/25 px-3 py-2 text-sm outline-none"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Tu nombre"
      />

      {msg && <div className="mt-2 text-sm text-white/80">{msg}</div>}

      <button
        onClick={save}
        disabled={saving}
        className="mt-3 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 disabled:opacity-50"
      >
        {saving ? "Guardando..." : "Guardar"}
      </button>
    </div>
  );
}
