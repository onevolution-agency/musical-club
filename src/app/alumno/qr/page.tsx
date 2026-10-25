import type { Metadata } from "next";
import QRCode from "qrcode";
import { attendanceSecret } from "@/lib/env";
import { requireRole } from "@/modules/auth/session";
import { signStudentQr } from "@/modules/attendance/domain";
import { activeStudent } from "@/modules/kids/session";

export const metadata: Metadata = { title: { absolute: "Mi QR · Musical Club" } };

export default async function QrPage() {
  const ctx = await requireRole(["student"]);
  const family = await activeStudent(ctx);
  if (family.mode === "follow") return <p className="empty">No disponible.</p>;
  const secret = attendanceSecret();
  if (!secret) {
    return <p className="form-error">No pudimos armar el QR.</p>;
  }
  const token = signStudentQr(family.id, secret);
  const dataUrl = await QRCode.toDataURL(token, { margin: 1, width: 480, errorCorrectionLevel: "M" });
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        {family.self ? "Tu QR" : family.profile.full_name}
      </h1>
      <div className="qr-frame">
        {/* El QR es un data URL generado en el servidor. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={`QR de asistencia de ${family.profile.full_name || "alumno"}`} />
      </div>
      <p className="hint">{family.profile.full_name}</p>
    </div>
  );
}
