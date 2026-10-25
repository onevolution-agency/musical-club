import type { Metadata } from "next";
import { ChildSwitch } from "@/components/kids/family";
import { AppShell } from "@/components/shell/app-shell";
import { requireRole } from "@/modules/auth/session";
import { followLabel } from "@/modules/follow/domain";
import { chooseChild } from "@/modules/kids/actions";
import { activeStudent } from "@/modules/kids/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Tu espacio · Musical Club" } };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRole(["student"]);
  const family = await activeStudent(ctx);
  return (
    <AppShell ctx={ctx} nav="student" title="Tu Musical Club">
      {family.children.length ? (
        <ChildSwitch
          action={chooseChild}
          activeId={family.self ? "yo" : family.id}
          options={[
            { id: "yo", label: "Yo" },
            ...family.children.map((child) => ({
              id: child.id,
              label: child.access === "follow" ? followLabel(child.full_name) : child.full_name,
            })),
          ]}
        />
      ) : null}
      {children}
    </AppShell>
  );
}
