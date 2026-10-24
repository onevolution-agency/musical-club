import type { Metadata } from "next";
import Link from "next/link";
import { AddChildFields } from "@/components/kids/family";
import { requireRole } from "@/modules/auth/session";
import { createChild } from "@/modules/kids/actions";
import { linkedChildren } from "@/modules/kids/session";

export const metadata: Metadata = { title: { absolute: "Hijos · Musical Club" } };

export default async function ChildrenPage() {
  const ctx = await requireRole(["student"]);
  const children = await linkedChildren(ctx);
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Hijos
      </h1>
      {children.length === 0 ? <p className="empty">Todavía no hay hijos.</p> : null}
      <div className="card-list">
        {children.map((child) => (
          <article key={child.id} className="panel">
            <p className="kicker">{child.access === "manager" && child.account_kind === "kid" ? "Kid" : "Contacto"}</p>
            <h2 className="display" style={{ fontSize: "1.6rem" }}>
              {child.full_name}
            </h2>
            <p>{child.birth_date}</p>
            {child.access === "manager" && child.account_kind === "kid" ? (
              <Link className="btn btn-paper" href={`/alumno/hijos/${child.id}`}>
                Ver
              </Link>
            ) : null}
          </article>
        ))}
      </div>
      <section className="panel stack">
        <h2 className="display" style={{ fontSize: "1.6rem" }}>
          Agregar
        </h2>
        <AddChildFields action={createChild} />
      </section>
    </div>
  );
}
