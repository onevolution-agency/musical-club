import type { Metadata } from "next";
import { BarrioLogo } from "@/components/brand/barrio-switcher";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { frequencyLabel } from "@/modules/activities/labels";
import { saveBarrio } from "@/modules/barrios/actions";
import { requireRole } from "@/modules/auth/session";
import { formatARS } from "@/lib/time";

export const metadata: Metadata = { title: { absolute: "Barrios · Musical Club" } };

export default async function BarriosPage({ searchParams }: { searchParams: Promise<{ id?: string }> }) {
  const { id } = await searchParams;
  const ctx = await requireRole(["admin"]);
  let query = ctx.supabase.from("barrios").select("*").order("name");
  if (ctx.profile.role !== "super_admin" && ctx.barrioId) query = query.eq("id", ctx.barrioId);
  const { data: barrios } = await query;
  const current = barrios?.find((barrio) => barrio.id === id) ?? (ctx.profile.role === "super_admin" ? null : barrios?.[0]);
  const canCreate = ctx.profile.role === "super_admin";
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Barrios
      </h1>
      <ActionForm action={saveBarrio} className="panel">
        {current && !canCreate ? <input type="hidden" name="id" value={current.id} /> : null}
        {current && canCreate && id ? <input type="hidden" name="id" value={current.id} /> : null}
        <label className="field">
          <span>Nombre</span>
          <input name="name" required defaultValue={id || !canCreate ? current?.name ?? "" : ""} />
        </label>
        <label className="field">
          <span>Enlace</span>
          <input name="slug" defaultValue={id || !canCreate ? current?.slug ?? "" : ""} />
        </label>
        <label className="field">
          <span>Logo</span>
          <input name="logoUrl" defaultValue={id || !canCreate ? current?.logo_url ?? "" : ""} />
        </label>
        <label className="field">
          <span>Arancel de referencia</span>
          <input name="defaultPricePesos" type="number" min={0} step="0.01" defaultValue={((current?.default_price_cents ?? 0) / 100).toString()} />
        </label>
        <label className="field">
          <span>Frecuencia</span>
          <select name="defaultBillingFrequency" defaultValue={current?.default_billing_frequency ?? "monthly"}>
            <option value="monthly">Mensual</option>
            <option value="biweekly">Cada 15 días</option>
          </select>
        </label>
        <label className="row">
          <input type="checkbox" name="active" defaultChecked={current ? current.active : true} style={{ width: 24, height: 24 }} />
          <span>Activo</span>
        </label>
        <label className="row">
          <input
            type="checkbox"
            name="teenCanUnfollow"
            defaultChecked={current ? current.teen_can_unfollow : true}
            style={{ width: 24, height: 24 }}
          />
          <span>Puede quitarlo</span>
        </label>
        <SubmitButton>{id || !canCreate ? "Guardar barrio" : "Crear barrio"}</SubmitButton>
      </ActionForm>
      {(barrios ?? []).length === 0 ? <p className="empty">No hay barrios.</p> : null}
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Barrio</th>
              <th>Arancel</th>
              <th>Frecuencia</th>
              <th>Estado</th>
            </tr>
          </thead>
          <tbody>
            {(barrios ?? []).map((barrio) => (
              <tr key={barrio.id}>
                <td>
                  <span className="person">
                    <BarrioLogo url={barrio.logo_url} />
                    <span>
                      <a href={`/admin/barrios?id=${barrio.id}`}>{barrio.name}</a>
                    </span>
                  </span>
                </td>
                <td>{formatARS(barrio.default_price_cents)}</td>
                <td>{frequencyLabel[barrio.default_billing_frequency]}</td>
                <td>{barrio.active ? "Activo" : "Pausado"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
