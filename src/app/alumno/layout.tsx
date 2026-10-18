import { AppShell } from "@/components/shell/app-shell";
import { requireRole } from "@/modules/auth/session";

export const dynamic = "force-dynamic";

export default async function Layout({ children }: { children: React.ReactNode }) {
  await requireRole(["student"]);
  return (
    <AppShell role="student" title="Tu Musical Club">
      {children}
    </AppShell>
  );
}
