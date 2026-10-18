import { describe, expect, it } from "vitest";
import { allCopyStrings, copy } from "./content";

const expected = [
  "PROYECTO EXCLUSIVO",
  "PARA COUNTRIES Y BARRIOS CERRADOS",
  "BY SANTIAGO ERRECALDE & GABY BIBAS",
  "UNA EXPERIENCIA ÚNICA DE TEATRO, CANTO Y BAILE EN FAMILIA PARA TU COMUNIDAD.",
  "EL CONCEPTO",
  "TU FAMILIA, TU SHOW",
  "Llevamos la energía y el profesionalismo de la comedia musical directamente a tu barrio.",
  "No es solo una clase. Es un taller de montaje artístico diseñado para toda la familia.",
  "Fomenta la salud, el bienestar emocional y la integración de los vecinos mediante una actividad recreativa de alto impacto.",
  "NUESTRO CICLO:",
  "UN MES, UN CUADRO MUSICAL",
  "3 Clases: Teatro, canto y danza. Montaje de escenas, técnica adaptada y mucha diversión.",
  "A mitad de año se realizará una muestra parcial en el Club House y a fin de año se realizará el showcase de fin de año con el montaje de una obra musical en un Teatro reconocido de la zona.",
  "BENEFICIOS PARA EL COUNTRY",
  "VALOR AGREGADO",
  "Salud: Promoción de hábitos activos y combate del sedentarismo.",
  "Desarrollo de espacio artístico y cultural para grandes y chicos.",
  "Comunidad: Una experiencia única para padres, hijos y amigos.",
  "Marketing: Material visual de alta calidad que el Country puede usar en sus canales oficiales.",
  "HABLEMOS DE INTEGRAR “MUSICAL CLUB” EN TU COMUNIDAD.",
  "Transformamos la actividad física en una experiencia artística compartida.",
  "Estamos listos para llevar la alegría y el movimiento a los fines de semana de su comunidad.",
  "DETALLES OPERATIVOS Y LOGÍSTICA",
  "TODO LO NECESARIO PARA IMPLEMENTAR MUSICAL CLUB EN TU COMUNIDAD.",
  "FORMATO Y FRECUENCIA",
  "Duración: Taller intensivo de 2 horas y media por jornada.",
  "Días de dictado: 1 encuentro semanal, a elección de la administración (Sábados o Domingos).",
  "Metodología: Módulos continuos de Teatro, Canto y Danza enfocados en el montaje del cuadro del mes.",
  "SEGMENTACIÓN POR EDADES",
  "Grupo Kids: Niños y niñas hasta los 12 años.",
  "Grupo Jóvenes y Adultos: A partir de 13 años (sin límite de edad).",
  "(Nota: En los eventos de muestra mid-year y showcase final, ambos grupos se integran en un mismo montaje escénico multifamiliar)",
  "REQUERIMIENTOS TÉCNICOS",
  "Espacio físico: Salón del Club House, Gimnasio o SUM cerrado.",
  "Sonido: Equipo de audio con conexión Bluetooth o cable Auxiliar.",
  "MODALIDAD DE CONTRATACIÓN",
  "Servicio Institucional: Programa cerrado exclusivo para los propietarios, sus familias e invitados del barrio.",
  "Beneficio exclusivo: La administración incorpora Musical Club como una actividad cultural y deportiva destacada dentro del cronograma del country.",
  "LLEVAMOS LA EXPERIENCIA DEL TEATRO MUSICAL DIRECTAMENTE A TU BARRIO, CON LA MÁXIMA CALIDAD TÉCNICA Y PEDAGÓGICA.",
  "Dir. Artística: Santiago Errecalde| Prod. Ejecutiva: Gaby Bibas",
];

describe("brochure copy", () => {
  it("keeps every sentence from the source PDFs", () => {
    const haystack = allCopyStrings();
    for (const sentence of expected) {
      expect(haystack).toContain(sentence);
    }
    expect(copy.ctaTitle.startsWith("HABLEMOS DE INTEGRAR")).toBe(true);
  });
});
