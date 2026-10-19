"use client";

import { chooseBarrio } from "@/modules/barrios/actions";

export function BarrioSwitcher({
  options,
  current,
  allowAll,
}: {
  options: { slug: string; name: string }[];
  current: string | null;
  allowAll: boolean;
}) {
  if (options.length === 0 && !allowAll) return null;
  const value = current ?? (allowAll ? "todos" : options[0]?.slug ?? "");
  return (
    <form action={chooseBarrio} className="barrio-switch">
      <label>
        <span className="sr-only">Tu barrio</span>
        <select
          name="slug"
          aria-label="Tu barrio"
          defaultValue={value}
          onChange={(event) => event.currentTarget.form?.requestSubmit()}
        >
          {allowAll ? <option value="todos">Todos los barrios</option> : null}
          {options.map((barrio) => (
            <option key={barrio.slug} value={barrio.slug}>
              {barrio.name}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
