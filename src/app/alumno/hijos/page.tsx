import type { Metadata } from "next";
import Link from "next/link";
import { AddChildFields } from "@/components/kids/family";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { requestFollow, resolveFollow, setFollowNotify } from "@/modules/follow/actions";
import { requireRole } from "@/modules/auth/session";
import { createChild, chooseChild } from "@/modules/kids/actions";
import { linkedChildren } from "@/modules/kids/session";

export const metadata: Metadata = { title: { absolute: "Hijos · Musical Club" } };

export default async function ChildrenPage() {
  const ctx = await requireRole(["student"]);
  const children = await linkedChildren(ctx);
  const { data: invited } = await ctx.supabase
    .from("follow_requests")
    .select("id, email, teen_id, direction")
    .eq("status", "pending")
    .eq("direction", "teen_invite")
    .eq("guardian_id", ctx.userId);
  const { data: invitedByMail } = ctx.email
    ? await ctx.supabase
        .from("follow_requests")
        .select("id, email, teen_id, direction")
        .eq("status", "pending")
        .eq("direction", "teen_invite")
        .is("guardian_id", null)
        .eq("email", ctx.email.toLowerCase())
    : { data: [] };
  const incoming = [...(invited ?? []), ...(invitedByMail ?? []).filter((row) => !(invited ?? []).some((item) => item.id === row.id))];
  const teenIds = [...new Set((incoming ?? []).map((row) => row.teen_id))];
  const { data: teens } = teenIds.length
    ? await ctx.supabase.from("profiles").select("id, full_name").in("id", teenIds)
    : { data: [] };
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Hijos
      </h1>
      {children.length === 0 ? <p className="empty">Todavía no hay hijos.</p> : null}
      <div className="card-list">
        {children.map((child) => (
          <article key={child.id} className="panel">
            <p className="kicker">
              {child.access === "follow" ? "Seguimiento" : child.access === "manager" && child.account_kind === "kid" ? "Kid" : "Contacto"}
            </p>
            <h2 className="display" style={{ fontSize: "1.6rem" }}>
              {child.full_name}
            </h2>
            <p>{child.birth_date}</p>
            {child.access === "manager" && child.account_kind === "kid" ? (
              <Link className="btn btn-paper" href={`/alumno/hijos/${child.id}`}>
                Ver
              </Link>
            ) : null}
            {child.access === "follow" ? (
              <div className="stack">
                <ActionForm action={chooseChild}>
                  <input type="hidden" name="childId" value={child.id} />
                  <SubmitButton className="btn btn-paper">Ver</SubmitButton>
                </ActionForm>
                <ActionForm action={setFollowNotify} className="row">
                  <input type="hidden" name="childId" value={child.id} />
                  <label className="row">
                    <input type="checkbox" name="enabled" defaultChecked={child.notify} style={{ width: 24, height: 24 }} />
                    <span>Avisos</span>
                  </label>
                  <SubmitButton className="btn btn-ghost">Guardar</SubmitButton>
                </ActionForm>
              </div>
            ) : null}
          </article>
        ))}
      </div>
      {(incoming ?? []).map((request) => (
        <article key={request.id} className="panel stack">
          <p className="kicker">Seguimiento</p>
          <h2 className="display" style={{ fontSize: "1.4rem" }}>
            {teens?.find((teen) => teen.id === request.teen_id)?.full_name || request.email}
          </h2>
          <div className="row">
            <ActionForm action={resolveFollow}>
              <input type="hidden" name="requestId" value={request.id} />
              <input type="hidden" name="accept" value="si" />
              <SubmitButton>Aceptar</SubmitButton>
            </ActionForm>
            <ActionForm action={resolveFollow}>
              <input type="hidden" name="requestId" value={request.id} />
              <input type="hidden" name="accept" value="no" />
              <SubmitButton className="btn btn-ghost">Rechazar</SubmitButton>
            </ActionForm>
          </div>
        </article>
      ))}
      <section className="panel stack">
        <h2 className="display" style={{ fontSize: "1.6rem" }}>
          Seguir
        </h2>
        <ActionForm action={requestFollow} className="stack">
          <label className="field">
            <span>Email</span>
            <input name="email" type="email" required />
          </label>
          <SubmitButton className="btn btn-paper">Pedir</SubmitButton>
        </ActionForm>
      </section>
      <section className="panel stack">
        <h2 className="display" style={{ fontSize: "1.6rem" }}>
          Agregar
        </h2>
        <AddChildFields action={createChild} />
      </section>
    </div>
  );
}
