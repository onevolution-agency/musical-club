"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { isSupabaseConfigured, siteUrl } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";
import { fieldError, profileSchema } from "@/modules/payments/schemas";
import { getSessionContext, homeFor, safeNext } from "./session";

export type ActionResult = { ok: true; message?: string } | { ok: false; error: string };

const credentials = z.object({
  email: z.email("Ingresá un email válido."),
  password: z.string().min(8, "La contraseña necesita al menos 8 caracteres."),
  fullName: z.string().trim().min(2).max(120).optional(),
  next: z.string().optional(),
});

export async function signInWithPassword(formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Falta conectar Supabase." };
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    next: formData.get("next")?.toString(),
  });
  if (!parsed.success) return { ok: false, error: fieldError(parsed.error) };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) return { ok: false, error: "Email o contraseña incorrectos." };
  const ctx = await getSessionContext();
  redirect(safeNext(parsed.data.next, ctx ? homeFor(ctx.profile.role) : "/alumno"));
}

export async function signInWithMagicLink(formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Falta conectar Supabase." };
  const email = z.email().safeParse(formData.get("email"));
  if (!email.success) return { ok: false, error: "Ingresá un email válido." };
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email: email.data,
    options: { emailRedirectTo: `${siteUrl()}/auth/callback` },
  });
  if (error) return { ok: false, error: "No pudimos enviar el enlace. Probá de nuevo." };
  return { ok: true, message: "Te mandamos un enlace para entrar. Revisá tu correo." };
}

export async function signUp(formData: FormData): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return { ok: false, error: "Falta conectar Supabase." };
  const parsed = credentials.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
    fullName: formData.get("fullName"),
  });
  if (!parsed.success || !parsed.data.fullName) {
    return { ok: false, error: parsed.success ? "Decinos tu nombre." : fieldError(parsed.error) };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      emailRedirectTo: `${siteUrl()}/auth/callback`,
      data: { full_name: parsed.data.fullName },
    },
  });
  if (error) return { ok: false, error: "No pudimos crear la cuenta. Si ya existe, ingresá." };
  if (data.session) redirect("/alumno");
  return { ok: true, message: "Revisá tu correo para confirmar la cuenta y después ingresá." };
}

export async function signOut() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}

export async function updateProfile(formData: FormData): Promise<ActionResult> {
  const ctx = await getSessionContext();
  if (!ctx) return { ok: false, error: "Tenés que ingresar." };
  const parsed = profileSchema.safeParse({
    fullName: formData.get("fullName"),
    phone: formData.get("phone") ?? "",
    dni: formData.get("dni") ?? "",
    birthDate: formData.get("birthDate") ?? "",
    emergencyContact: formData.get("emergencyContact") ?? "",
  });
  if (!parsed.success) return { ok: false, error: fieldError(parsed.error) };
  const { error } = await ctx.supabase
    .from("profiles")
    .update({
      full_name: parsed.data.fullName,
      phone: parsed.data.phone || null,
      dni: parsed.data.dni || null,
      birth_date: parsed.data.birthDate || null,
      emergency_contact: parsed.data.emergencyContact || null,
    })
    .eq("id", ctx.userId);
  if (error) return { ok: false, error: "No pudimos guardar el perfil." };
  return { ok: true, message: "Perfil actualizado." };
}
