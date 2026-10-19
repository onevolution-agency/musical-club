import { ProfileForm } from "@/components/profile/profile-form";
import { requireRole } from "@/modules/auth/session";

export default async function AdminProfilePage() {
  const ctx = await requireRole(["admin"]);
  return <ProfileForm ctx={ctx} />;
}
