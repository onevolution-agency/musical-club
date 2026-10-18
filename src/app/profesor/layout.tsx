import { AppShell } from "@/components/shell/app-shell";
import { requireRole } from "@/modules/auth/session";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireRole(["teacher", "admin"]);
  return (
    <AppShell role="teacher" title="Toma de clase">
      {children}
    </AppShell>
  );
}
