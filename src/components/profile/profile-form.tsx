import { AvatarUploader } from "@/components/profile/avatar-uploader";
import { ActionForm, SubmitButton } from "@/components/ui/forms";
import { updateProfile } from "@/modules/auth/actions";
import type { SessionContext } from "@/modules/auth/session";

export function ProfileForm({ ctx }: { ctx: SessionContext }) {
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Tu perfil
      </h1>
      <p className="hint">{ctx.email}</p>
      <AvatarUploader userId={ctx.userId} name={ctx.profile.full_name || "Musical Club"} url={ctx.profile.avatar_url} />
      <ActionForm action={updateProfile} className="panel">
        <label className="field">
          <span>Nombre y apellido</span>
          <input name="fullName" required defaultValue={ctx.profile.full_name} />
        </label>
        <label className="field">
          <span>Teléfono</span>
          <input name="phone" defaultValue={ctx.profile.phone ?? ""} />
        </label>
        <label className="field">
          <span>DNI</span>
          <input name="dni" defaultValue={ctx.profile.dni ?? ""} />
        </label>
        <label className="field">
          <span>Fecha de nacimiento</span>
          <input name="birthDate" type="date" defaultValue={ctx.profile.birth_date ?? ""} />
        </label>
        <label className="field">
          <span>Contacto de emergencia</span>
          <input name="emergencyContact" defaultValue={ctx.profile.emergency_contact ?? ""} />
        </label>
        <SubmitButton>Guardar</SubmitButton>
      </ActionForm>
    </div>
  );
}
