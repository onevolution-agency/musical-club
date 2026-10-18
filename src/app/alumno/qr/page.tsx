import QRCode from "qrcode";
import { attendanceSecret } from "@/lib/env";
import { requireRole } from "@/modules/auth/session";
import { signStudentQr } from "@/modules/attendance/domain";

export default async function QrPage() {
  const ctx = await requireRole(["student"]);
  const secret = attendanceSecret();
  if (!secret) {
    return <p className="form-error">Falta configurar ATTENDANCE_QR_SECRET para generar el código.</p>;
  }
  const token = signStudentQr(ctx.userId, secret);
  const dataUrl = await QRCode.toDataURL(token, { margin: 1, width: 480, errorCorrectionLevel: "M" });
  return (
    <div className="stack">
      <h1 className="display" style={{ fontSize: "2.2rem" }}>
        Tu QR de asistencia
      </h1>
      <p>Mostrale este código al profe cuando entres. Sirve una sola vez por clase.</p>
      <div className="qr-frame">
        {/* El QR es un data URL generado en el servidor. */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={dataUrl} alt={`QR de asistencia de ${ctx.profile.full_name || "alumno"}`} />
      </div>
      <p className="hint">{ctx.profile.full_name}</p>
    </div>
  );
}
