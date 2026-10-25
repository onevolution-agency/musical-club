import type { Metadata } from "next";
import QRCode from "qrcode";
import { attendanceSecret } from "@/lib/env";
import { requireRole } from "@/modules/auth/session";
import { signStudentQr } from "@/modules/attendance/domain";

export const metadata: Metadata = { title: { absolute: "Mi QR · Musical Club" } };

export default async function QrPage() {
  const ctx = await requireRole(["student"]);
  const secret = attendanceSecret();
  if (!secret) {
    return <p className="form-error">No pudimos armar el QR.</p>;
  }
  const token = signStudentQr(ctx.userId, secret);
  const dataUrl = await QRCode.toDataURL(token, { margin: 1, width: 480, errorCorrectionLevel: "M" });
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Tu QR
      </h1>
      <div className="qr-frame">
        {/* El QR es un data URL generado en el servidor. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={`QR de asistencia de ${ctx.profile.full_name || "alumno"}`} />
      </div>
      <p className="hint">{ctx.profile.full_name}</p>
    </div>
  );
}
