"use server";

import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { publicBarrioSlug } from "@/modules/barrios/public";
import { fieldError, inquirySchema } from "@/modules/payments/schemas";
import type { ActionResult } from "@/modules/auth/actions";

export async function sendInquiry(formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    return { ok: false, error: "El formulario no está disponible." };
  }
  const parsed = inquirySchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    phone: formData.get("phone") ?? "",
    community: formData.get("community") ?? "",
    message: formData.get("message"),
  });
  if (!parsed.success) return { ok: false, error: fieldError(parsed.error) };
  const supabase = await createClient();
  const slug = await publicBarrioSlug();
  const barrio = slug
    ? (await supabase.from("barrios").select("id").eq("slug", slug).maybeSingle()).data
    : null;
  const { error } = await supabase.from("inquiries").insert({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    community: parsed.data.community || null,
    barrio_id: barrio?.id ?? null,
    message: parsed.data.message,
  });
  if (error) return { ok: false, error: "No pudimos enviar la consulta." };
  return { ok: true, message: "Recibimos tu consulta. Te vamos a escribir." };
}
