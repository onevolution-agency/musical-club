import type { MetadataRoute } from "next";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = siteUrl();
  const entries: MetadataRoute.Sitemap = [
    { url: origin, changeFrequency: "weekly", priority: 1 },
    { url: `${origin}/actividades`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${origin}/contacto`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${origin}/llms.txt`, changeFrequency: "monthly", priority: 0.3 },
    { url: `${origin}/llms-full.txt`, changeFrequency: "monthly", priority: 0.3 },
  ];
  if (!isSupabaseConfigured()) return entries;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from("activities").select("slug, updated_at").eq("status", "active");
    const seen = new Set<string>();
    for (const activity of data ?? []) {
      if (seen.has(activity.slug)) continue;
      seen.add(activity.slug);
      entries.push({
        url: `${origin}/actividades/${activity.slug}`,
        lastModified: activity.updated_at,
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  } catch {
    return entries;
  }
  return entries;
}
