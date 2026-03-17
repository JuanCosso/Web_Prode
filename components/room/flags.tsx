export const TEAM_TO_CODE: Record<string, string> = {
    "Argentina": "ar", "Brasil": "br", "Francia": "fr", "Alemania": "de",
    "España": "es", "Portugal": "pt", "Inglaterra": "gb-eng", "Italia": "it",
    "Países Bajos": "nl", "Bélgica": "be", "Uruguay": "uy", "Colombia": "co",
    "México": "mx", "Sudáfrica": "za", "Corea del Sur": "kr", "Japón": "jp",
    "Marruecos": "ma", "Senegal": "sn", "Ghana": "gh", "Nigeria": "ng",
    "Estados Unidos": "us", "Canadá": "ca", "Australia": "au", "Croatia": "hr",
    "Dinamarca": "dk", "Suecia": "se", "Suiza": "ch", "Polonia": "pl",
    "Serbia": "rs", "Ecuador": "ec", "Qatar": "qa", "Arabia Saudita": "sa",
    "Irán": "ir", "Túnez": "tn", "Camerún": "cm", "Gales": "gb-wls",
    "Costa Rica": "cr", "Perú": "pe", "Chile": "cl", "Bolivia": "bo",
    "Paraguay": "py", "Venezuela": "ve", "Honduras": "hn", "Panamá": "pa",
    "Jamaica": "jm", "El Salvador": "sv", "Nueva Zelanda": "nz", "Eslovaquia": "sk",
    "Haití": "ht", "Escocia": "gb-sct", "Curazao": "cw", "Costa de Marfil": "ci",
    "Egipto": "eg", "Cabo Verde": "cv", "Noruega": "no", "Austria": "at",
    "Jordania": "jo", "Argelia": "dz", "Uzbekistán": "uz",
    "Irlanda": "ie", "Irlanda del Norte": "gb-nir", "Bosnia": "ba", "Kosovo": "xk",
    "Ucrania": "ua", "Albania": "al", "Turquía": "tr", "Rumania": "ro",
    "Macedonia": "mk", "República Checa": "cz", "Surinam": "sr", "Nueva Caledonia": "nc",
    "Irak": "iq", "RD Congo": "cd",
  };
  
  export function flagCodeFor(t: string): string | null {
    return TEAM_TO_CODE[t] ?? null;
  }
  
  export function Flag({ code, alt }: { code: string | null; alt: string }) {
    if (!code) return <span className="text-sm">🏴</span>;
    return (
      <img
        src={`https://flagcdn.com/20x15/${code}.png`}
        alt={alt}
        width={20}
        height={15}
        className="inline-block rounded-[2px] object-cover shrink-0"
        onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
      />
    );
  }