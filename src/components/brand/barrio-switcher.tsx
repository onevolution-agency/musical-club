"use client";

import { chooseBarrio } from "@/modules/barrios/actions";

export type BarrioOption = { slug: string; name: string; logoUrl: string | null };

export function BarrioLogo({ url }: { url: string | null }) {
  if (!url) return <span className="barrio-logo barrio-logo-empty" aria-hidden="true" />;
  return (
    // Logos are URLs saved by an admin, so they are not part of the image optimizer.
    // eslint-disable-next-line @next/next/no-img-element
    <img className="barrio-logo" src={url} alt="" width={32} height={32} />
  );
}

export function BarrioSwitcher({
  options,
  current,
  allowAll,
}: {
  options: BarrioOption[];
  current: string | null;
  allowAll: boolean;
}) {
  if (options.length === 0 && !allowAll) return null;
  const value = current ?? (allowAll ? "todos" : "");
  const selected = options.find((barrio) => barrio.slug === value);
  const label = value === "todos" ? "Todos" : selected?.name ?? "Elegí tu barrio";
  return (
    <form action={chooseBarrio} className="barrio-switch">
      <details>
        <summary aria-label="Elegí tu barrio">
          {value !== "todos" ? <BarrioLogo url={selected?.logoUrl ?? null} /> : null}
          <span>{label}</span>
        </summary>
        <div className="barrio-menu">
          {allowAll ? (
            <button type="submit" name="slug" value="todos">
              Todos
            </button>
          ) : null}
          {options.map((barrio) => (
            <button key={barrio.slug} type="submit" name="slug" value={barrio.slug}>
              <BarrioLogo url={barrio.logoUrl} />
              {barrio.name}
            </button>
          ))}
        </div>
      </details>
    </form>
  );
}
