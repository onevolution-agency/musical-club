import { describe, expect, it } from "vitest";
import { attendanceMessage, evaluateAttendance, signStudentQr, verifyStudentQr } from "./domain";

const secret = "qr-secret";
const studentId = "11111111-1111-4111-8111-111111111111";

describe("attendance QR and dedupe", () => {
  it("roundtrips a signed student QR and rejects tampering", () => {
    const token = signStudentQr(studentId, secret);
    expect(verifyStudentQr(token, secret)).toBe(studentId);
    expect(verifyStudentQr(token, "other")).toBeNull();
    expect(verifyStudentQr(`${token}a`, secret)).toBeNull();
    expect(verifyStudentQr("mc1.not-a-uuid.abcd", secret)).toBeNull();
  });

  it("accepts the first mark and rejects a duplicate", () => {
    const base = {
      studentId,
      sessionStatus: "open" as const,
      sessionActivityId: "act-1",
      enrollment: { activityId: "act-1", status: "active" },
      alreadyMarked: false,
    };
    expect(evaluateAttendance(base)).toEqual({ ok: true });
    const duplicate = evaluateAttendance({ ...base, alreadyMarked: true });
    expect(duplicate).toEqual({ ok: false, code: "duplicate" });
    if (!duplicate.ok) expect(attendanceMessage(duplicate.code, "Lola")).toMatch(/ya estaba presente/);
  });

  it("rejects a closed class, a missing enrollment, and a bad QR", () => {
    expect(
      evaluateAttendance({
        studentId,
        sessionStatus: "closed",
        sessionActivityId: "act-1",
        enrollment: { activityId: "act-1", status: "active" },
        alreadyMarked: false,
      }).ok,
    ).toBe(false);
    expect(
      evaluateAttendance({
        studentId,
        sessionStatus: "open",
        sessionActivityId: "act-1",
        enrollment: { activityId: "act-1", status: "cancelled" },
        alreadyMarked: false,
      }),
    ).toEqual({ ok: false, code: "not_enrolled" });
    expect(
      evaluateAttendance({
        studentId: null,
        sessionStatus: "open",
        sessionActivityId: "act-1",
        enrollment: null,
        alreadyMarked: false,
      }),
    ).toEqual({ ok: false, code: "invalid_qr" });
  });
});
