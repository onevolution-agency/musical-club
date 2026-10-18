import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter, SiteHeader } from "@/components/brand/site-chrome";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { ageGroupCopy, frequencyLabel } from "@/modules/activities/labels";
import { copy } from "@/modules/cms/content";
import { formatARS } from "@/lib/time";
import type { ActivityRow } from "@/lib/supabase/database.types";

export const metadata: Metadata = {
  title: "Actividades",
  description: `${copy.cycleTitle}. ${copy.cycle[0]}`,
  alternates: { canonical: "/actividades" },
};

export const dynamic = "force-dynamic";

async function loadActivities(): Promise<ActivityRow[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("activities").select("*").eq("status", "active").order("name");
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function ActivitiesPage() {
  const activities = await loadActivities();
  return (
    <>
      <SiteHeader />
      <main id="contenido" className="section">
        <div className="wrap stack">
          <header>
            <p className="kicker">{copy.cycleKicker}</p>
            <h1 className="display statement">{copy.cycleTitle}</h1>
            <ul className="stars">
              {copy.cycle.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </header>
          {activities.length === 0 ? (
            <div className="ops-grid">
              {copy.ages.map((item) => (
                <article key={item} className="panel">
                  <h2 className="display" style={{ fontSize: "2rem" }}>
                    {item}
                  </h2>
                  <p>{copy.format[1]}</p>
                  <Link className="btn btn-red" href="/contacto">
                    {copy.ctaTitle}
                  </Link>
                </article>
              ))}
            </div>
          ) : (
            <div className="card-list">
              {activities.map((activity) => (
                <article key={activity.id} className="panel">
                  <p className="kicker">{ageGroupCopy[activity.age_group]}</p>
                  <h2 className="display" style={{ fontSize: "2.2rem" }}>
                    <Link href={`/actividades/${activity.slug}`}>{activity.name}</Link>
                  </h2>
                  <p>{activity.description}</p>
                  <p>{activity.schedule_label}</p>
                  <p>{activity.location}</p>
                  <p>{frequencyLabel[activity.billing_frequency]}</p>
                  {activity.price_cents > 0 ? <p>{formatARS(activity.price_cents)}</p> : null}
                  <Link className="btn btn-red" href={`/actividades/${activity.slug}`}>
                    Ver actividad
                  </Link>
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
