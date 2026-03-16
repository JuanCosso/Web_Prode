"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import { AuthButton } from "@/components/auth/AuthButton";

export function MobileMenu({ displayName }: { displayName: string | null }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    if (open) document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    // z-[100] en el wrapper entero — por encima del contenido de página
    <div ref={ref} className="relative z-[100]">
      {/* Botón hamburguesa */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-white/20 bg-white/10 backdrop-blur transition hover:bg-white/15 cursor-pointer"
        aria-label="Menú"
      >
        <span className="flex flex-col gap-[5px] items-center justify-center w-4">
          <span className={["block h-px w-full bg-white transition-all duration-200", open ? "translate-y-[6px] rotate-45" : ""].join(" ")} />
          <span className={["block h-px w-full bg-white transition-all duration-200", open ? "opacity-0" : ""].join(" ")} />
          <span className={["block h-px w-full bg-white transition-all duration-200", open ? "-translate-y-[6px] -rotate-45" : ""].join(" ")} />
        </span>
      </button>

      {/* Dropdown — z-[100] heredado del padre, absolute normal */}
      {open && (
        <div className="absolute right-0 top-11 w-52 rounded-2xl border border-white/15 bg-slate-900 shadow-2xl p-2">

          {/* Nombre */}
          {displayName && (
              <Link
              href="/profile"
              onClick={() => setOpen(false)}
              className="block px-3 py-2.5 border-b border-white/10 mb-1 hover:bg-white/5 transition rounded-t-xl cursor-pointer"
            >
              <p className="text-[11px] text-white/40 uppercase tracking-widest font-semibold leading-none mb-1">Jugador</p>
              <p className="text-sm font-semibold text-white truncate">{displayName}</p>
            </Link>
          )}

          {/* AuthButton — iniciar/cerrar sesión */}
          <div className="px-1 pt-1">
            <AuthButton />
          </div>

        </div>
      )}
    </div>
  );
}