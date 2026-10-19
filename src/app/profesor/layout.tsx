import type { Metadata } from "next";
import { AppShell } from "@/components/shell/app-shell";
import { requireRole } from "@/modules/auth/session";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: { absolute: "Profesorado · Musical Club" } };

export default async function Layout({ children }: { children: React.ReactNode }) {
  const ctx = await requireRole(["teacher", "admin"]);
  return (
    <AppShell ctx={ctx} nav="teacher" title="Toma de clase">
      {children}
    </AppShell>
  );
}
