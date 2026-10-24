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
    return <p className="form-error">Falta configurar ATTENDANCE_QR_SECRET para generar el código.</p>;
  }
  const token = signStudentQr(family.id, secret);
  const dataUrl = await QRCode.toDataURL(token, { margin: 1, width: 480, errorCorrectionLevel: "M" });
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        {family.self ? "Tu QR de asistencia" : family.profile.full_name}
      </h1>
      <p>Mostrale este código al profe cuando entres. Sirve una sola vez por clase.</p>
      <div className="qr-frame">
        {/* El QR es un data URL generado en el servidor. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={`QR de asistencia de ${family.profile.full_name || "alumno"}`} />
      </div>
      <p className="hint">{family.profile.full_name}</p>
    </div>
  );
}
