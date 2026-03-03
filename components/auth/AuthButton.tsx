"use client";

import { signIn, signOut, useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";

function WarningModal({
  onCancel,
  onConfirm,
}: {
  onCancel: () => void;
  onConfirm: () => void;
}) {
  if (typeof window === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999]">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />
      <div className="absolute inset-0 flex items-center justify-center p-4">
        <div className="bg-slate-900 p-6 rounded-2xl max-w-md w-full border border-yellow-400/20 shadow-2xl shadow-black/50">
          
          {/* Header con franja amarilla */}
          <div className="flex items-center gap-3 mb-4">
            <div className="flex-shrink-0 w-9 h-9 rounded-xl bg-yellow-400/15 flex items-center justify-center">
              <span className="text-yellow-400 text-lg">⚠</span>
            </div>
            <h2 className="text-lg font-semibold text-yellow-400">
              Atención
            </h2>
          </div>

          {/* Línea separadora amarilla */}
          <div className="h-px bg-yellow-400/20 mb-4" />

          <p className="text-white/70 text-sm leading-relaxed">
            Tu cuenta de invitado tiene partidas o predicciones guardadas.
            <br /><br />
            Si la cuenta de Google a la que ingreses <span className="text-white font-medium">ya tiene datos propios</span>, perderás todo lo realizado como invitado.
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-sm text-white/60 hover:text-white transition rounded-lg hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-5 py-2 text-sm bg-white text-slate-950 font-semibold rounded-xl hover:bg-white/90 transition"
            >
              Continuar de todas formas
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

export function AuthButton() {
  const { data, status } = useSession();
  const [checkingGuest, setCheckingGuest] = useState(false);
  const [guestHasData, setGuestHasData] = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    if (!data?.user) {
      setCheckingGuest(true);
      fetch("/api/guest-status")
        .then((res) => res.json())
        .then((res) => {
          setGuestHasData(res.hasData);
        })
        .finally(() => setCheckingGuest(false));
    }
  }, [data]);

  if (status === "loading" || checkingGuest) {
    return (
      <button className="rounded-xl border border-white/20 px-4 py-2 text-sm text-white/70">
        Cargando…
      </button>
    );
  }

  if (data?.user) {
    return (
      <button
        onClick={() => signOut()}
        className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-sm font-medium backdrop-blur transition hover:border-white/30 hover:bg-white/15"
      >
        Cerrar sesión
      </button>
    );
  }

  const handleLogin = () => {
    if (guestHasData) {
      setShowModal(true);
    } else {
      signIn("google");
    }
  };

  return (
    <>
      <button
        onClick={handleLogin}
        className="rounded-xl bg-white text-slate-900 px-4 py-2 font-medium"
      >
        Continuar con Google
      </button>

      {showModal && (
        <WarningModal
          onCancel={() => setShowModal(false)}
          onConfirm={() => signIn("google")}
        />
      )}
    </>
  );
}
