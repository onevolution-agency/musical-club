import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { ReleaseFields } from "@/components/kids/family";
import { requireRole } from "@/modules/auth/session";
import { inviteGuardian, releaseChild, unlinkGuardian, updateChild } from "@/modules/kids/actions";
import { splitName } from "@/modules/kids/domain";
import { canManageChild } from "@/modules/kids/session";

export const metadata: Metadata = { title: { absolute: "Hijo · Musical Club" } };

export default async function ChildPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireRole(["student"]);
  if (!(await canManageChild(ctx, id))) notFound();
  const { data: child } = await ctx.supabase.from("profiles").select("*").eq("id", id).maybeSingle();
  if (!child || child.account_kind !== "kid") notFound();
  const { data: links } = await ctx.supabase.from("guardianships").select("guardian_id, access").eq("child_id", id);
  const guardianIds = (links ?? []).map((link) => link.guardian_id);
  const { data: guardians } = guardianIds.length
    ? await ctx.supabase.from("profiles").select("id, full_name, email, phone").in("id", guardianIds)
    : { data: [] };
  const name = splitName(child.full_name);
  return (
    <div className="stack">
      <p className="kicker">Kid</p>
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        {child.full_name}
      </h1>
      <div className="row">
        <Link className="btn btn-red" href="/alumno/qr">
          QR
        </Link>
        <Link className="btn btn-ghost" href="/alumno/actividades">
          Inscribir
        </Link>
        <Link className="btn btn-ghost" href="/alumno/cuotas">
          Cuotas
        </Link>
      </div>
      <section className="panel stack">
        <h2 className="display" style={{ fontSize: "1.5rem" }}>
          Datos
        </h2>
        <ActionForm action={updateChild} className="stack">
          <input type="hidden" name="childId" value={child.id} />
          <label className="field">
            <span>Nombre</span>
            <input name="firstName" required defaultValue={name.firstName} />
          </label>
          <label className="field">
            <span>Apellido</span>
            <input name="lastName" required defaultValue={name.lastName} />
          </label>
          <label className="field">
            <span>Nacimiento</span>
            <input name="birthDate" type="date" required defaultValue={child.birth_date ?? ""} />
          </label>
          <SubmitButton className="btn btn-paper">Guardar</SubmitButton>
        </ActionForm>
      </section>
      <section className="stack">
        <h2 className="display" style={{ fontSize: "1.5rem" }}>
          Responsables
        </h2>
        {(links ?? []).map((link) => {
          const guardian = guardians?.find((item) => item.id === link.guardian_id);
          return (
            <div key={link.guardian_id} className="panel row">
              <p style={{ flex: 1 }}>
                {guardian?.full_name || "Responsable"}
                {guardian?.phone ? ` · ${guardian.phone}` : ""}
                {guardian?.email ? ` · ${guardian.email}` : ""}
              </p>
              {link.guardian_id === ctx.userId ? null : (
                <ActionForm action={unlinkGuardian}>
                  <input type="hidden" name="childId" value={child.id} />
                  <input type="hidden" name="guardianId" value={link.guardian_id} />
                  <SubmitButton className="btn btn-ghost">Quitar</SubmitButton>
                </ActionForm>
              )}
            </div>
          );
        })}
        <ActionForm action={inviteGuardian} className="row">
          <input type="hidden" name="childId" value={child.id} />
          <label className="field" style={{ flex: 1 }}>
            <span>Email</span>
            <input name="email" type="email" required />
          </label>
          <SubmitButton className="btn btn-paper">Invitar</SubmitButton>
        </ActionForm>
      </section>
      <section className="panel stack">
        <h2 className="display" style={{ fontSize: "1.5rem" }}>
          Liberar
        </h2>
        <ReleaseFields childId={child.id} action={releaseChild} />
      </section>
    </div>
  );
}
