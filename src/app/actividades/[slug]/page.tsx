import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteFooter, SiteHeader } from "@/components/brand/site-chrome";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ageGroupCopy, frequencyLabel, weekdays } from "@/modules/activities/labels";
import { copy } from "@/modules/cms/content";
import { JsonLd } from "@/modules/cms/jsonld";
import { enrollSelf } from "@/modules/enrollments/actions";
import { getSessionContext } from "@/modules/auth/session";
import { formatARS } from "@/lib/time";

export const dynamic = "force-dynamic";

async function load(slug: string) {
  if (!isSupabaseConfigured()) return null;
  const supabase = await createClient();
  const { data } = await supabase.from("activities").select("*").eq("slug", slug).maybeSingle();
  return data;
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const activity = await load(slug);
  if (!activity) return { title: "Actividad" };
  return {
    title: activity.name,
    description: activity.description,
    alternates: { canonical: `/actividades/${activity.slug}` },
  };
}

export default async function ActivityDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const activity = await load(slug);
  if (!activity || activity.status !== "active") notFound();
  const session = await getSessionContext();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": ["Course", "EducationEvent"],
    name: activity.name,
    description: activity.description,
    url: `${siteUrl()}/actividades/${activity.slug}`,
    inLanguage: "es-AR",
    provider: { "@type": "EducationalOrganization", name: "Musical Club", url: siteUrl() },
    eventAttendanceMode: "https://schema.org/OfflineEventAttendanceMode",
    duration: "PT2H30M",
    location: { "@type": "Place", name: activity.location, address: { "@type": "PostalAddress", addressCountry: "AR" } },
    offers:
      activity.price_cents > 0
        ? { "@type": "Offer", price: (activity.price_cents / 100).toFixed(2), priceCurrency: "ARS" }
        : undefined,
  };
  return (
    <>
      <JsonLd data={jsonLd} />
      <SiteHeader />
      <main id="contenido" className="section">
        <article className="wrap panel stack">
          <p className="kicker">{ageGroupCopy[activity.age_group]}</p>
          <h1 className="display statement">{activity.name}</h1>
          <p>{activity.description}</p>
          <ul className="stars">
            <li>{activity.schedule_label}</li>
            {activity.weekday !== null ? (
              <li>
                {weekdays[activity.weekday]}
                {activity.start_time ? ` ${activity.start_time.slice(0, 5)}` : ""}
                {activity.end_time ? ` a ${activity.end_time.slice(0, 5)}` : ""}
              </li>
            ) : null}
            <li>{activity.location}</li>
            <li>{frequencyLabel[activity.billing_frequency]}</li>
            <li>Cupo: {activity.capacity}</li>
            {activity.price_cents > 0 ? <li>{formatARS(activity.price_cents)}</li> : null}
          </ul>
          <p>{copy.format[2]}</p>
          <p>{copy.ages[2]}</p>
          {session?.profile.role === "student" ? (
            <ActionForm action={enrollSelf}>
              <input type="hidden" name="activityId" value={activity.id} />
              <SubmitButton>Inscribirme</SubmitButton>
            </ActionForm>
          ) : (
            <Link className="btn btn-red" href={session ? "/alumno/actividades" : `/ingresar?next=/actividades/${activity.slug}`}>
              {session ? "Ir a mi espacio" : "Ingresá para inscribirte"}
            </Link>
          )}
        </article>
      </main>
      <SiteFooter />
    </>
  );
}
