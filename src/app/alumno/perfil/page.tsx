import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile/profile-form";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { endFollow, inviteFollower, resolveFollow } from "@/modules/follow/actions";
import { teenBirthOk } from "@/modules/follow/domain";
import { requireRole } from "@/modules/auth/session";
import { todayInArgentina } from "@/lib/time";

export const metadata: Metadata = { title: { absolute: "Perfil · Musical Club" } };

export default async function ProfilePage() {
  const ctx = await requireRole(["student"]);
  const teen = teenBirthOk(ctx.profile.birth_date, todayInArgentina());
  const { data: requests } = teen
    ? await ctx.supabase
        .from("follow_requests")
        .select("id, email, guardian_id, direction, status")
        .eq("teen_id", ctx.userId)
        .eq("status", "pending")
    : { data: [] };
  const { data: links } = teen
    ? await ctx.supabase
        .from("guardianships")
        .select("guardian_id, barrio_id")
        .eq("child_id", ctx.userId)
        .eq("access", "follow")
        .is("ended_at", null)
    : { data: [] };
  const guardianIds = [...new Set((links ?? []).map((link) => link.guardian_id))];
  const { data: guardians } = guardianIds.length
    ? await ctx.supabase.from("profiles").select("id, full_name, email").in("id", guardianIds)
    : { data: [] };
  const barrioIds = [...new Set((links ?? []).map((link) => link.barrio_id))];
  const { data: barrios } = barrioIds.length
    ? await ctx.supabase.from("barrios").select("id, teen_can_unfollow").in("id", barrioIds)
    : { data: [] };
  const canUnfollow = (barrioId: string) => barrios?.find((barrio) => barrio.id === barrioId)?.teen_can_unfollow !== false;
  return (
    <div className="stack">
      <ProfileForm ctx={ctx} />
      {teen ? (
        <section className="panel stack">
          <h2 className="display" style={{ fontSize: "1.6rem" }}>
            Seguimiento
          </h2>
          <ActionForm action={inviteFollower} className="stack">
            <label className="field">
              <span>Email</span>
              <input name="email" type="email" required />
            </label>
            <SubmitButton>Invitar</SubmitButton>
          </ActionForm>
          {(requests ?? [])
            .filter((request) => request.direction === "guardian_request")
            .map((request) => (
              <div key={request.id} className="row">
                <span style={{ flex: 1 }}>{request.email}</span>
                <ActionForm action={resolveFollow}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <input type="hidden" name="accept" value="si" />
                  <SubmitButton className="btn btn-paper">Aceptar</SubmitButton>
                </ActionForm>
                <ActionForm action={resolveFollow}>
                  <input type="hidden" name="requestId" value={request.id} />
                  <input type="hidden" name="accept" value="no" />
                  <SubmitButton className="btn btn-ghost">Rechazar</SubmitButton>
                </ActionForm>
              </div>
            ))}
          {(links ?? []).map((link) => {
            const guardian = guardians?.find((item) => item.id === link.guardian_id);
            return (
              <div key={link.guardian_id} className="row">
                <span style={{ flex: 1 }}>{guardian?.full_name || guardian?.email || "Responsable"}</span>
                {canUnfollow(link.barrio_id) ? (
                  <ActionForm action={endFollow}>
                    <input type="hidden" name="childId" value={ctx.userId} />
                    <input type="hidden" name="guardianId" value={link.guardian_id} />
                    <SubmitButton className="btn btn-ghost">Quitar</SubmitButton>
                  </ActionForm>
                ) : null}
              </div>
            );
          })}
        </section>
      ) : null}
    </div>
  );
}
