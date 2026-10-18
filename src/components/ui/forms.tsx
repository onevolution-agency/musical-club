"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import type { ActionResult } from "@/modules/auth/actions";

export function SubmitButton({
  children,
  className = "btn btn-red",
}: {
  children: string;
  className?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button className={className} disabled={pending}>
      {pending ? "Un momento…" : children}
    </button>
  );
}

export function ActionForm({
  action,
  children,
  className,
}: {
  action: (formData: FormData) => Promise<ActionResult>;
  children: React.ReactNode;
  className?: string;
}) {
  const [state, formAction] = useActionState(
    async (_previous: ActionResult | null, formData: FormData) => action(formData),
    null,
  );
  return (
    <form action={formAction} className={className}>
      {children}
      {state && !state.ok ? (
        <p className="form-error" role="alert">
          {state.error}
        </p>
      ) : null}
      {state?.ok && state.message ? (
        <p className="form-ok" role="status">
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
