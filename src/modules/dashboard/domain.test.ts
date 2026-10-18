import { describe, expect, it } from "vitest";
import { attendanceRate, summarizeDashboard, toCsv } from "./domain";

describe("dashboard summary", () => {
  it("breaks revenue down by method and reconciles cash for the period", () => {
    const summary = summarizeDashboard({
      today: "2026-03-10",
      cashFrom: "2026-03-01",
      cashTo: "2026-03-31",
      activities: [
        { id: "kids", name: "Grupo Kids" },
        { id: "ya", name: "Jóvenes y Adultos" },
      ],
      enrollments: [
        { studentId: "s1", activityId: "kids", status: "active" },
        { studentId: "s2", activityId: "kids", status: "active" },
        { studentId: "s1", activityId: "ya", status: "cancelled" },
      ],
      fees: [
        { id: "f1", amountCents: 10000, dueDate: "2026-03-01", status: "pending", activityId: "kids", studentId: "s1" },
        { id: "f2", amountCents: 10000, dueDate: "2026-03-20", status: "pending", activityId: "kids", studentId: "s2" },
      ],
      payments: [
        { id: "p1", feeId: "f1", amountCents: 4000, method: "efectivo", status: "approved", receivedBy: "admin-a", paidOn: "2026-03-05" },
        { id: "p2", feeId: "f2", amountCents: 10000, method: "mercadopago", status: "approved", receivedBy: null, paidOn: "2026-03-06" },
      ],
      attendance: [{ activityId: "kids", sessions: 2, marks: 3, enrolled: 2 }],
    });

    expect(summary.revenueByMethod).toEqual({ efectivo: 4000, mercadopago: 10000 });
    expect(summary.revenueCents).toBe(14000);
    expect(summary.overdueCents).toBe(6000);
    expect(summary.pendingCents).toBe(0);
    expect(summary.activeStudents).toBe(2);
    expect(summary.enrollmentsByActivity).toEqual([
      { activityId: "kids", name: "Grupo Kids", count: 2 },
      { activityId: "ya", name: "Jóvenes y Adultos", count: 0 },
    ]);
    expect(summary.attendanceByActivity[0]?.rate).toBe(attendanceRate(3, 4));
    expect(summary.cashByAdmin).toEqual([{ adminId: "admin-a", totalCents: 4000, count: 1 }]);
  });

  it("escapes csv cells", () => {
    expect(toCsv(["nombre", "nota"], [["Ana", "dijo \"hola\""]])).toBe('nombre,nota\nAna,"dijo ""hola"""');
  });
});
