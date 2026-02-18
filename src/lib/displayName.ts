type Err =
  | "EMPTY"
  | "LENGTH"
  | "SPACES"
  | "CHARS"
  | "RESERVED";

const MIN = 3;
const MAX = 25;

// Letras (incluye tildes) + números. Permite 1 espacio entre palabras.
const ALLOWED = /^[\p{L}\p{N}]+(?: [\p{L}\p{N}]+)*$/u;

// Reservados (no importa mayúsc/minúsc)
const RESERVED = new Set(["admin", "owner", "moderador", "root", "soporte", "support"]);

export function parseDisplayName(input: string):
  | { ok: true; displayName: string; key: string }
  | { ok: false; error: Err; message: string } {
  const raw = String(input ?? "");

  // solo espacios / vacío
  if (!raw.trim()) {
    return { ok: false, error: "EMPTY", message: "El nombre no puede estar vacío." };
  }

  // sin espacios al inicio/fin
  if (raw !== raw.trim()) {
    return {
      ok: false,
      error: "SPACES",
      message: "No se permiten espacios al inicio o al final.",
    };
  }

  // sin doble espacio
  if (raw.includes("  ")) {
    return {
      ok: false,
      error: "SPACES",
      message: "No se permiten dos espacios seguidos.",
    };
  }

  if (raw.length < MIN || raw.length > MAX) {
    return {
      ok: false,
      error: "LENGTH",
      message: `Debe tener entre ${MIN} y ${MAX} caracteres.`,
    };
  }

  // Solo letras/números y espacios simples
  if (!ALLOWED.test(raw)) {
    return {
      ok: false,
      error: "CHARS",
      message: "Solo se permiten letras, números y un espacio simple (sin símbolos).",
    };
  }

  // Reservados (case-insensitive)
  if (RESERVED.has(raw.toLowerCase())) {
    return { ok: false, error: "RESERVED", message: "Ese nombre está reservado." };
  }

  // ✅ case-sensitive: la key queda EXACTAMENTE igual al nombre
  // (Avyl != avyl)
  return { ok: true, displayName: raw, key: raw };
}
