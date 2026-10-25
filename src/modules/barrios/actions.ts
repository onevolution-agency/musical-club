"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import type { ActionResult } from "@/modules/auth/actions";
import { getSessionContext } from "@/modules/auth/session";
import { ALL_BARRIOS, BARRIO_COOKIE, slugifyBarrio } from "./domain";

const cookieOptions = {
  path: "/",
  maxAge: 60 * 60 * 24 * 365,
  sameSite: "lax" as const,
  httpOnly: true,
};

export async function chooseBarrio(formData: FormData) {
  const slug = String(formData.get("slug") ?? "");
  const jar = await cookies();
  const ctx = isSupabaseConfigured() ? await getSessionContext() : null;

  if (slug === ALL_BARRIOS) {
    if (ctx && ctx.profile.role !== "super_admin") return;
    jar.set(BARRIO_COOKIE, ALL_BARRIOS, cookieOptions);
    if (ctx?.profile.role === "super_admin") {
      await ctx.supabase.from("profiles").update({ current_barrio_id: null }).eq("id", ctx.userId);
    }
    revalidatePath("/", "layout");
    return;
  }

  if (!isSupabaseConfigured()) return;
  const supabase = ctx?.supabase ?? (await createClient());
  const { data: barrio } = await supabase.from("barrios").select("id, active").eq("slug", slug).maybeSingle();
  if (!barrio?.active) return;
  if (ctx && ctx.profile.role !== "super_admin" && !ctx.memberships.some((row) => row.barrio_id === barrio.id)) return;
  jar.set(BARRIO_COOKIE, slug, cookieOptions);
  if (ctx) {
    await ctx.supabase.from("profiles").update({ current_barrio_id: barrio.id }).eq("id", ctx.userId);
  }
  revalidatePath("/", "layout");
}

export async function saveBarrio(formData: FormData): Promise<ActionResult> {
  const ctx = await getSessionContext();
  if (!ctx || (ctx.role !== "admin" && ctx.role !== "super_admin" && ctx.profile.role !== "super_admin")) {
    return { ok: false, error: "No podés editar barrios." };
  }
  const name = String(formData.get("name") ?? "").trim();
  const slugInput = String(formData.get("slug") ?? "").trim();
  const logo = String(formData.get("logoUrl") ?? "").trim();
  const active = formData.get("active") === "on" || formData.get("active") === "true";
  const pricePesos = Number(formData.get("defaultPricePesos") ?? 0);
  const frequency = String(formData.get("defaultBillingFrequency") ?? "monthly");
  const id = String(formData.get("id") ?? "");
  if (name.length < 2) return { ok: false, error: "El barrio necesita un nombre." };
  if (!Number.isFinite(pricePesos) || pricePesos < 0) return { ok: false, error: "El arancel no puede ser negativo." };
  if (frequency !== "monthly" && frequency !== "biweekly") return { ok: false, error: "Frecuencia inválida." };
  const slug = slugifyBarrio(slugInput || name);
  if (!slug) return { ok: false, error: "Falta el nombre." };
  const payload = {
    name,
    slug,
    logo_url: logo || null,
    active,
    default_price_cents: Math.round(pricePesos * 100),
    default_billing_frequency: frequency as "monthly" | "biweekly",
    teen_can_unfollow: formData.get("teenCanUnfollow") === "on",
  };
  if (!id && ctx.profile.role !== "super_admin") {
    return { ok: false, error: "No podés crear barrios." };
  }
  const query = id
    ? ctx.supabase.from("barrios").update(payload).eq("id", id)
    : ctx.supabase.from("barrios").insert(payload);
  const { error } = await query;
  if (error) return { ok: false, error: "No pudimos guardar el barrio." };
  revalidatePath("/admin/barrios");
  revalidatePath("/");
  return { ok: true, message: "Barrio guardado." };
}
