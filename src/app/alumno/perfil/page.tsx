import { ProfileForm } from "@/components/profile/profile-form";
import { requireRole } from "@/modules/auth/session";

export default async function ProfilePage() {
  const ctx = await requireRole(["student"]);
  return <ProfileForm ctx={ctx} />;
}
