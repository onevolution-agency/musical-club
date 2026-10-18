import { copy } from "@/modules/cms/content";
import { siteUrl } from "@/lib/env";

export function GET() {
  const origin = siteUrl();
  const body = `# Musical Club

> ${copy.experience}

Programa de teatro, canto y danza para countries y barrios cerrados en Argentina.
${copy.byline}

## Páginas
- [Inicio](${origin}/): ${copy.heroTitle}
- [Actividades](${origin}/actividades): ${copy.cycleTitle}
- [Contacto](${origin}/contacto): ${copy.ctaTitle}
- [Detalle](${origin}/llms-full.txt)

## El concepto
${copy.concept.map((item) => `- ${item}`).join("\n")}

## Ciclo
${copy.cycle.map((item) => `- ${item}`).join("\n")}

## Edades
${copy.ages.map((item) => `- ${item}`).join("\n")}

## Contacto
${copy.ctaTitle}
${copy.ctaBody.join(" ")}
`;
  return new Response(body, {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
