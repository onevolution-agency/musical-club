import type { Metadata } from "next";
import { ProfileForm } from "@/components/profile/profile-form";
import { requireRole } from "@/modules/auth/session";

export const metadata: Metadata = { title: { absolute: "Perfil · Musical Club" } };

export default async function AdminProfilePage() {
  const ctx = await requireRole(["admin"]);
  return <ProfileForm ctx={ctx} />;
}
