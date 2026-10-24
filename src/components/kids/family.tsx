import { ActionForm, SubmitButton } from "@/components/ui/forms";
import type { ActionResult } from "@/modules/auth/actions";

export function ChildSwitch({
  options,
  activeId,
  action,
}: {
  options: { id: string; label: string }[];
  activeId: string;
  action?: (formData: FormData) => Promise<ActionResult>;
}) {
  const fields = (
    <>
      <label className="field" style={{ flex: 1 }}>
        <span>Hijo</span>
        <select name="childId" defaultValue={activeId}>
          {options.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <SubmitButton className="btn btn-paper">Ver</SubmitButton>
    </>
  );
  if (!action) {
    return (
      <form className="row">
        <label className="field" style={{ flex: 1 }}>
          <span>Hijo</span>
          <select name="childId" defaultValue={activeId}>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <button className="btn btn-paper" type="button">
          Ver
        </button>
      </form>
    );
  }
  return (
    <ActionForm action={action} className="row">
      {fields}
    </ActionForm>
  );
}

export function AddChildFields({
  action,
}: {
  action?: (formData: FormData) => Promise<ActionResult>;
}) {
  const fields = (
    <>
      <label className="field">
        <span>Nombre</span>
        <input name="firstName" required autoComplete="given-name" />
      </label>
      <label className="field">
        <span>Apellido</span>
        <input name="lastName" required autoComplete="family-name" />
      </label>
      <label className="field">
        <span>Nacimiento</span>
        <input name="birthDate" type="date" required />
      </label>
      <SubmitButton>Agregar</SubmitButton>
    </>
  );
  if (!action) {
    return (
      <form className="stack">
        <label className="field">
          <span>Nombre</span>
          <input name="firstName" defaultValue="Lola" readOnly />
        </label>
        <label className="field">
          <span>Apellido</span>
          <input name="lastName" defaultValue="Herrera" readOnly />
        </label>
        <label className="field">
          <span>Nacimiento</span>
          <input name="birthDate" type="date" defaultValue="2018-04-12" readOnly />
        </label>
        <button className="btn btn-red" type="button">
          Agregar
        </button>
      </form>
    );
  }
  return (
    <ActionForm action={action} className="stack">
      {fields}
    </ActionForm>
  );
}

export function ReleaseFields({
  childId,
  action,
  email = "",
}: {
  childId: string;
  email?: string;
  action?: (formData: FormData) => Promise<ActionResult>;
}) {
  const fields = (
    <>
      <input type="hidden" name="childId" value={childId} />
      <label className="field">
        <span>Email</span>
        <input name="email" type="email" required defaultValue={email} autoComplete="off" />
      </label>
      <label className="field">
        <span>Contraseña</span>
        <input name="password" type="password" autoComplete="new-password" minLength={8} />
      </label>
      <SubmitButton>Liberar</SubmitButton>
    </>
  );
  if (!action) {
    return (
      <form className="stack">
        <input type="hidden" name="childId" value={childId} />
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" defaultValue={email || "lola.herrera@musicalclub.test"} readOnly />
        </label>
        <label className="field">
          <span>Contraseña</span>
          <input name="password" type="password" defaultValue="MusicalClub2026" readOnly />
        </label>
        <button className="btn btn-red" type="button">
          Liberar
        </button>
      </form>
    );
  }
  return (
    <ActionForm action={action} className="stack">
      {fields}
    </ActionForm>
  );
}
