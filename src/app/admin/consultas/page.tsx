import type { Metadata } from "next";
import { requireRole, scopeBarrio } from "@/modules/auth/session";
import { formatDateTimeAR } from "@/lib/time";

export const metadata: Metadata = { title: { absolute: "Consultas · Musical Club" } };

export default async function InquiriesPage() {
  const ctx = await requireRole(["admin"]);
  const { data: inquiries } = await scopeBarrio(
    ctx.supabase.from("inquiries").select("*").order("created_at", { ascending: false }).limit(100),
    ctx.barrioId,
  );
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Consultas
      </h1>
      {(inquiries ?? []).length === 0 ? <p className="empty">No hay consultas.</p> : null}
      {(inquiries ?? []).map((inquiry) => (
        <article key={inquiry.id} className="panel">
          <h2 className="display" style={{ fontSize: "1.4rem" }}>
            {inquiry.name}
          </h2>
          <p>
            {inquiry.email} {inquiry.phone ? `· ${inquiry.phone}` : ""} {inquiry.community ? `· ${inquiry.community}` : ""}
          </p>
          <p>{inquiry.message}</p>
          <p className="hint">{formatDateTimeAR(inquiry.created_at)}</p>
        </article>
      ))}
    </div>
  );
}
