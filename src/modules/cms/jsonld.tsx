import { copy } from "./content";

export function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />;
}

export function organizationGraph(origin: string) {
  const orgId = `${origin}/#organization`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": ["Organization", "EducationalOrganization"],
        "@id": orgId,
        name: "Musical Club",
        url: origin,
        description: copy.experience,
        inLanguage: "es-AR",
        areaServed: { "@type": "Country", name: "Argentina" },
        founder: [
          { "@type": "Person", name: copy.directors.artistic, jobTitle: "Dir. Artística" },
          { "@type": "Person", name: copy.directors.executive, jobTitle: "Prod. Ejecutiva" },
        ],
        address: { "@type": "PostalAddress", addressCountry: "AR" },
      },
      courseNode(origin, orgId, "Grupo Kids", copy.ages[0], "kids"),
      courseNode(origin, orgId, "Grupo Jóvenes y Adultos", copy.ages[1], "jovenes-y-adultos"),
    ],
  };
}

function courseNode(origin: string, orgId: string, name: string, description: string, slug: string) {
  return {
    "@type": ["Course", "EducationEvent"],
    "@id": `${origin}/actividades/${slug}#course`,
    name,
    description,
    url: `${origin}/actividades/${slug}`,
    inLanguage: "es-AR",
    provider: { "@id": orgId },
    organizer: { "@id": orgId },
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    eventStatus: "https://schema.org/EventScheduled",
    duration: "PT2H30M",
    location: {
      "@type": "Place",
      name: "Salón del Club House, Gimnasio o SUM cerrado",
      address: { "@type": "PostalAddress", addressCountry: "AR" },
    },
    eventSchedule: {
      "@type": "Schedule",
      repeatFrequency: "P1W",
      scheduleTimezone: "America/Argentina/Buenos_Aires",
      description: copy.format[1],
    },
    hasCourseInstance: {
      "@type": "CourseInstance",
      name: copy.cycleTitle,
      courseMode: "onsite",
      courseWorkload: "PT2H30M",
      description: copy.cycle[0],
    },
  };
}
