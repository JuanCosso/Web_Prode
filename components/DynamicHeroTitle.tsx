"use client";

import { useState, useEffect } from "react";

const PAISES = [
  // CONMEBOL
  "Argentina", "Brasil", "Uruguay", "Colombia", "Ecuador", "Paraguay", "Bolivia",
  // UEFA
  "Francia", "Inglaterra", "España", "Alemania", "Países Bajos", "Portugal",
  "Italia", "Bélgica", "Croacia", "Suiza", "Austria", "Noruega",
  "Escocia", "Dinamarca",
  // AFC
  "Japón", "Irán", "Corea del Sur", "Australia", "Arabia Saudita",
  "Qatar", "Jordania", "Uzbekistán",
  // CAF
  "Marruecos", "Senegal", "Egipto", "Costa de Marfil", "Túnez",
  "Argelia", "Sudáfrica", "Ghana", "Cabo Verde",
  // CONCACAF
  "Canadá", "Estados Unidos", "México", "Panamá", "Haití", "Curazao",
  // OFC
  "Nueva Zelanda",
];

const FRASES = [
  "¿Quién sabe más de fútbol entre vos y tus amigos?",
  "¿Vos decís que [PAIS] da la sorpresa?",
  "Estoy seguro que [PAIS] decepciona...",
  "Mucho análisis, pero terminás rogando que [PAIS] meta un gol de rebote.",
  "Ojo con el 9 de [PAIS].",
  "¿Y si la pega el que apostó a [PAIS] campeón?",
  "Demostrá que intuís mejor que el que puso a [PAIS] en la final.",
  "El verdadero 'experto' siempre pone a [PAIS] en octavos.",
  "Si [PAIS] pasa de fase, me retiro del fútbol.",
  "Esa fé ciega en [PAIS] te va a arruinar el Prode.",
  "Llega a ganar el asado por pegarla con [PAIS] tenés que cerrar el estadio.",
  "Burrada histórica confiar en [PAIS].",
  "Sí, capaz [PAIS] pecheó pero Chile ni jugó.",
  "Se viene masterpiece del DT de [PAIS].",
  "El 10 de [PAIS] hace vivir el fútbol.",
];

const STORAGE_KEY = "prode_frases_queue";

function getNextFrase(): string {
  // Recuperamos la cola guardada en sessionStorage
  let queue: number[] = [];
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) queue = JSON.parse(raw);
  } catch { /**/ }

  // Si la cola está vacía o agotada, creamos un shuffle nuevo
  if (!queue || queue.length === 0) {
    queue = Array.from({ length: FRASES.length }, (_, i) => i);
    // Fisher-Yates shuffle
    for (let i = queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [queue[i], queue[j]] = [queue[j], queue[i]];
    }
  }

  // Tomamos el primer índice de la cola
  const idx = queue.shift()!;

  // Guardamos la cola restante
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch { /**/ }

  // Aplicamos país aleatorio
  const frase = FRASES[idx];
  const pais = PAISES[Math.floor(Math.random() * PAISES.length)];
  return frase.replace("[PAIS]", pais);
}

export default function DynamicHeroTitle() {
  const [mounted, setMounted] = useState(false);
  const [fraseActual, setFraseActual] = useState("");

  useEffect(() => {
    setMounted(true);
    setFraseActual(getNextFrase());
  }, []);

  if (!mounted) {
    return (
      <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl min-h-[144px] flex items-center justify-center opacity-0">
        &nbsp;
      </h1>
    );
  }

  return (
    <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl animate-in fade-in duration-700">
      {fraseActual}
    </h1>
  );
}