"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { siteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/modules/auth/session";
import { fieldError, inviteSchema } from "@/modules/payments/schemas";
import type { ActionResult } from "@/modules/auth/actions";

export async function inviteStaff(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["admin"]);
  const parsed = inviteSchema.safeParse({
    email: formData.get("email"),
    fullName: formData.get("fullName"),
    role: formData.get("role") ?? "teacher",
  });
  if (!parsed.success) return { ok: false, error: fieldError(parsed.error) };
  if (!ctx.barrioId) return { ok: false, error: "Falta el barrio." };
  const token = randomUUID();
  const expires = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
  const { error } = await ctx.supabase.from("staff_invites").insert({
    email: parsed.data.email,
    role: parsed.data.role,
    full_name: parsed.data.fullName,
    token,
    invited_by: ctx.userId,
    expires_at: expires,
    barrio_id: ctx.barrioId,
  });
  if (error) return { ok: false, error: "No pudimos crear la invitación." };

  const admin = createAdminClient();
  if (!admin) {
    revalidatePath("/admin/profesores");
    return {
      ok: true,
      message: "Invitación guardada.",
    };
  }

  const { data: existing } = await admin.from("profiles").select("id").ilike("email", parsed.data.email).maybeSingle();
  if (existing) {
    await admin.from("barrio_memberships").upsert({
      user_id: existing.id,
      barrio_id: ctx.barrioId,
      role: parsed.data.role,
    });
    await admin.from("staff_invites").update({ accepted_at: new Date().toISOString() }).eq("token", token);
    revalidatePath("/admin/profesores");
    return { ok: true, message: "Rol actualizado." };
  }

  const { error: inviteError } = await admin.auth.admin.inviteUserByEmail(parsed.data.email, {
    redirectTo: `${siteUrl()}/auth/callback`,
    data: { full_name: parsed.data.fullName },
  });
  revalidatePath("/admin/profesores");
  if (inviteError) {
    return { ok: true, message: "Invitación guardada. El mail no salió." };
  }
  return { ok: true, message: "Invitación enviada." };
}

export async function setUserRole(formData: FormData): Promise<ActionResult> {
  const ctx = await requireRole(["admin"]);
  const userId = String(formData.get("userId") ?? "");
  const role = String(formData.get("role") ?? "");
  if (role !== "student" && role !== "teacher" && role !== "admin") return { ok: false, error: "Rol inválido." };
  if (!ctx.barrioId) return { ok: false, error: "Falta el barrio." };
  if (userId === ctx.userId && role !== "admin") return { ok: false, error: "No podés sacarte el rol." };
  const { error } = await ctx.supabase.from("barrio_memberships").upsert({
    user_id: userId,
    barrio_id: ctx.barrioId,
    role,
  });
  if (error) return { ok: false, error: "No pudimos cambiar el rol." };
  revalidatePath("/admin/profesores");
  revalidatePath("/admin/alumnos");
  return { ok: true, message: "Rol actualizado." };
}
