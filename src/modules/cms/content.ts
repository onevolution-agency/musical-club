/**
 * Copy literal de musical-club-original.pdf (fuente) con la jerarquía visual
 * de musical-club-propuesta.pdf. No reescribir estas frases.
 */
export const copy = {
  brand: "musical club",
  heroTitle: "PROYECTO EXCLUSIVO",
  heroBanner: "PARA COUNTRIES Y BARRIOS CERRADOS",
  byline: "BY SANTIAGO ERRECALDE & GABY BIBAS",
  experience:
    "UNA EXPERIENCIA ÚNICA DE TEATRO, CANTO Y BAILE EN FAMILIA PARA TU COMUNIDAD.",
  conceptKicker: "EL CONCEPTO",
  conceptTitle: "TU FAMILIA, TU SHOW",
  concept: [
    "Llevamos la energía y el profesionalismo de la comedia musical directamente a tu barrio.",
    "No es solo una clase. Es un taller de montaje artístico diseñado para toda la familia.",
    "Fomenta la salud, el bienestar emocional y la integración de los vecinos mediante una actividad recreativa de alto impacto.",
  ],
  cycleKicker: "NUESTRO CICLO:",
  cycleTitle: "UN MES, UN CUADRO MUSICAL",
  cycle: [
    "3 Clases: Teatro, canto y danza. Montaje de escenas, técnica adaptada y mucha diversión.",
    "A mitad de año se realizará una muestra parcial en el Club House y a fin de año se realizará el showcase de fin de año con el montaje de una obra musical en un Teatro reconocido de la zona.",
  ],
  benefitsKicker: "BENEFICIOS PARA EL COUNTRY",
  benefitsTitle: "VALOR AGREGADO",
  benefits: [
    "Salud: Promoción de hábitos activos y combate del sedentarismo.",
    "Desarrollo de espacio artístico y cultural para grandes y chicos.",
    "Comunidad: Una experiencia única para padres, hijos y amigos.",
    "Marketing: Material visual de alta calidad que el Country puede usar en sus canales oficiales.",
  ],
  ctaTitle: "HABLEMOS DE INTEGRAR “MUSICAL CLUB” EN TU COMUNIDAD.",
  ctaBody: [
    "Transformamos la actividad física en una experiencia artística compartida.",
    "Estamos listos para llevar la alegría y el movimiento a los fines de semana de su comunidad.",
  ],
  opsTitle: "DETALLES OPERATIVOS Y LOGÍSTICA",
  opsIntro: "TODO LO NECESARIO PARA IMPLEMENTAR MUSICAL CLUB EN TU COMUNIDAD.",
  formatTitle: "FORMATO Y FRECUENCIA",
  format: [
    "Duración: Taller intensivo de 2 horas y media por jornada.",
    "Días de dictado: 1 encuentro semanal, a elección de la administración (Sábados o Domingos).",
    "Metodología: Módulos continuos de Teatro, Canto y Danza enfocados en el montaje del cuadro del mes.",
  ],
  agesTitle: "SEGMENTACIÓN POR EDADES",
  ages: [
    "Grupo Kids: Niños y niñas hasta los 12 años.",
    "Grupo Jóvenes y Adultos: A partir de 13 años (sin límite de edad).",
    "(Nota: En los eventos de muestra mid-year y showcase final, ambos grupos se integran en un mismo montaje escénico multifamiliar)",
  ],
  techTitle: "REQUERIMIENTOS TÉCNICOS",
  tech: [
    "Espacio físico: Salón del Club House, Gimnasio o SUM cerrado.",
    "Sonido: Equipo de audio con conexión Bluetooth o cable Auxiliar.",
  ],
  contractTitle: "MODALIDAD DE CONTRATACIÓN",
  contract: [
    "Servicio Institucional: Programa cerrado exclusivo para los propietarios, sus familias e invitados del barrio.",
    "Beneficio exclusivo: La administración incorpora Musical Club como una actividad cultural y deportiva destacada dentro del cronograma del country.",
  ],
  closing:
    "LLEVAMOS LA EXPERIENCIA DEL TEATRO MUSICAL DIRECTAMENTE A TU BARRIO, CON LA MÁXIMA CALIDAD TÉCNICA Y PEDAGÓGICA.",
  credits: "Dir. Artística: Santiago Errecalde| Prod. Ejecutiva: Gaby Bibas",
  directors: {
    artistic: "Santiago Errecalde",
    executive: "Gaby Bibas",
  },
} as const;

export function allCopyStrings(): string[] {
  const values: string[] = [];
  const walk = (value: unknown) => {
    if (typeof value === "string") values.push(value);
    else if (Array.isArray(value)) value.forEach(walk);
    else if (value && typeof value === "object") Object.values(value).forEach(walk);
  };
  walk(copy);
  return values;
}
