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
        <div className="bg-slate-900 p-6 rounded-2xl max-w-md w-full border border-white/10 shadow-2xl">
          <h2 className="text-lg font-semibold mb-3">
            ⚠ Atención
          </h2>

          <p className="text-white/70 text-sm">
            Tu cuenta de invitado tiene partidas o predicciones guardadas.
            <br /><br />
            Si la cuenta de Google a la que ingreses ya tiene datos,
            perderás lo realizado como invitado.
          </p>

          <div className="flex justify-end gap-3 mt-6">
            <button
              onClick={onCancel}
              className="px-4 py-2 text-white/70"
            >
              Cancelar
            </button>
            <button
              onClick={onConfirm}
              className="px-4 py-2 bg-white text-black rounded-lg"
            >
              Continuar
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
      <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
        <div className="text-sm text-white/70">
          Sesión:{" "}
          <span className="text-white">
            {data.user.email ?? data.user.name}
          </span>
        </div>
        <button
          onClick={() => signOut()}
          className="rounded-xl border border-white/20 px-4 py-2 font-medium"
        >
          Cerrar sesión
        </button>
      </div>
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
