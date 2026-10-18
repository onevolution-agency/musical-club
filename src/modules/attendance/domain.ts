import { createHmac, timingSafeEqual } from "node:crypto";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function signStudentQr(studentId: string, secret: string): string {
  const sig = createHmac("sha256", secret).update(`mc1:${studentId}`).digest("hex").slice(0, 32);
  return `mc1.${studentId}.${sig}`;
}

export function verifyStudentQr(token: string, secret: string): string | null {
  const parts = token.trim().split(".");
  if (parts.length !== 3 || parts[0] !== "mc1") return null;
  const studentId = parts[1] ?? "";
  const provided = (parts[2] ?? "").toLowerCase();
  if (!UUID.test(studentId) || !/^[0-9a-f]{32}$/.test(provided)) return null;
  const expected = signStudentQr(studentId, secret).split(".")[2] ?? "";
  if (expected.length !== provided.length) return null;
  if (!timingSafeEqual(Buffer.from(expected), Buffer.from(provided))) return null;
  return studentId;
}

export type AttendanceReject = "invalid_qr" | "closed" | "not_enrolled" | "wrong_activity" | "duplicate";

export function evaluateAttendance(input: {
  studentId: string | null;
  sessionStatus: "open" | "closed";
  sessionActivityId: string;
  enrollment: { activityId: string; status: string } | null;
  alreadyMarked: boolean;
}): { ok: true } | { ok: false; code: AttendanceReject } {
  if (!input.studentId) return { ok: false, code: "invalid_qr" };
  if (input.sessionStatus !== "open") return { ok: false, code: "closed" };
  if (!input.enrollment || input.enrollment.status !== "active") {
    return { ok: false, code: "not_enrolled" };
  }
  if (input.enrollment.activityId !== input.sessionActivityId) {
    return { ok: false, code: "wrong_activity" };
  }
  if (input.alreadyMarked) return { ok: false, code: "duplicate" };
  return { ok: true };
}

export function attendanceMessage(code: AttendanceReject, name?: string): string {
  const who = name ? name : "Este alumno";
  switch (code) {
    case "duplicate":
      return `${who} ya estaba presente. No se duplicó la asistencia.`;
    case "closed":
      return "Esta clase ya está cerrada.";
    case "not_enrolled":
      return `${who} no tiene una inscripción activa en esta actividad.`;
    case "wrong_activity":
      return "El QR corresponde a otra actividad.";
    default:
      return "No pudimos leer ese QR. Probá de nuevo o marcalo a mano.";
  }
}
