import { allCopyStrings, copy } from "@/modules/cms/content";
import { siteUrl } from "@/lib/env";

export function GET() {
  const lines = [
    "# Musical Club",
    "",
    `Sitio: ${siteUrl()}`,
    `Idioma: es-AR`,
    "",
    "Este archivo reproduce el copy de la propuesta, sin reescritura.",
    "",
    ...allCopyStrings().map((line) => line.trim()).filter((line, index, all) => line && all.indexOf(line) === index),
    "",
    "## Operación para familias",
    "- Las familias se anotan como alumnos.",
    "- La cuota se paga en Mercado Pago.",
    "- El efectivo lo registra solo un admin y queda en el historial del alumno.",
    "- La asistencia se toma con el QR personal del alumno.",
    "",
    copy.credits,
  ];
  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
