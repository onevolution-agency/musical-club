import { ProfileForm } from "@/components/profile/profile-form";
import { requireRole } from "@/modules/auth/session";

export default async function TeacherProfilePage() {
  const ctx = await requireRole(["teacher", "admin"]);
  return <ProfileForm ctx={ctx} />;
}
