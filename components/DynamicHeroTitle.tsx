"use client";

import { useState, useEffect } from "react";

const PAISES = [
    
    // CONMEBOL (Sudamérica)
    "Argentina", "Brasil", "Uruguay", "Colombia", "Ecuador", "Paraguay", "Bolivia",
    
    // UEFA (Europa)
    "Francia", "Inglaterra", "España", "Alemania", "Países Bajos", "Portugal", 
    "Italia", "Bélgica", "Croacia", "Suiza", "Austria", "Noruega", 
    "Escocia", "Dinamarca",
    
    // AFC (Asia)
    "Japón", "Irán", "Corea del Sur", "Australia", "Arabia Saudita", 
    "Qatar", "Jordania", "Uzbekistán",
    
    // CAF (África)
    "Marruecos", "Senegal", "Egipto", "Costa de Marfil", "Túnez", 
    "Argelia", "Sudáfrica", "Ghana", "Cabo Verde",
    
    // CONCACAF (Norte, Centroamérica y Caribe)
    "Canadá", "Estados Unidos", "México", "Panamá", "Haití", "Curazao",
    
    // OFC (Oceanía)
    "Nueva Zelanda"
  ];

const FRASES = [
  "¿Quién sabe más de fútbol entre vos y tus amigos?", // La clásica
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
  "Lamine Yamal / [PAIS] en la final? QUE MAAAANDAAANNN.",
  "Sí, capaz [PAIS] pecheó pero Chile ni jugó.",
];

export default function DynamicHeroTitle() {
  const [mounted, setMounted] = useState(false);
  const [fraseActual, setFraseActual] = useState("");

  useEffect(() => {
    // Se ejecuta solo en el cliente
    setMounted(true);
    
    // Elegimos frase y país al azar
    const randomFrase = FRASES[Math.floor(Math.random() * FRASES.length)];
    const randomPais = PAISES[Math.floor(Math.random() * PAISES.length)];
    
    // Reemplazamos [PAIS] si existe en la frase
    const fraseLista = randomFrase.replace("[PAIS]", randomPais);
    setFraseActual(fraseLista);
  }, []);

  // Para evitar hydration mismatch, renderizamos un espacio en blanco
  // o la estructura básica sin texto hasta que cargue en el cliente.
  if (!mounted) {
    return (
      <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl min-h-[144px] flex items-center justify-center opacity-0 transition-opacity duration-500">
        Cargando...
      </h1>
    );
  }

  // Animación simple de fade in
  return (
    <h1 className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl animate-in fade-in duration-700">
      {fraseActual}
    </h1>
  );
}