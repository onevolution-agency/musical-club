import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { requireRole } from "@/modules/auth/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Tu espacio" };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRole(["student"]);
  return (
    <AppShell ctx={ctx} nav="student" title="Tu Musical Club">
      {children}
    </AppShell>
  );
}
