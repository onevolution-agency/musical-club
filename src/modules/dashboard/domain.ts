import {
  deriveFeeStatus,
  remainingCents,
  revenueByMethod,
  reconcileCash,
  type FeeSnapshot,
  type FeeStatus,
  type PaymentSnapshot,
} from "@/modules/payments/domain";

export function attendanceRate(marks: number, expected: number): number {
  if (expected <= 0) return 0;
  return Math.round((marks / expected) * 1000) / 10;
}

export type DashboardFee = FeeSnapshot & { activityId: string; studentId: string };
export type DashboardPayment = PaymentSnapshot & { paidOn: string };

export type DashboardSummary = {
  revenueCents: number;
  revenueByMethod: { mercadopago: number; efectivo: number };
  pendingCents: number;
  overdueCents: number;
  pendingCount: number;
  overdueCount: number;
  activeStudents: number;
  enrollmentsByActivity: { activityId: string; name: string; count: number }[];
  attendanceByActivity: { activityId: string; name: string; rate: number; marks: number; expected: number }[];
  cashByAdmin: { adminId: string; totalCents: number; count: number }[];
};

export function summarizeDashboard(input: {
  payments: DashboardPayment[];
  fees: DashboardFee[];
  enrollments: { studentId: string; activityId: string; status: string }[];
  activities: { id: string; name: string }[];
  attendance: { activityId: string; sessions: number; marks: number; enrolled: number }[];
  today: string;
  cashFrom: string;
  cashTo: string;
}): DashboardSummary {
  const paymentsByFee = new Map<string, PaymentSnapshot[]>();
  for (const payment of input.payments) {
    const list = paymentsByFee.get(payment.feeId) ?? [];
    list.push(payment);
    paymentsByFee.set(payment.feeId, list);
  }

  let pendingCents = 0;
  let overdueCents = 0;
  let pendingCount = 0;
  let overdueCount = 0;
  for (const fee of input.fees) {
    const related = paymentsByFee.get(fee.id) ?? [];
    const status: FeeStatus = deriveFeeStatus(fee, related, input.today);
    if (status !== "pending" && status !== "partial" && status !== "overdue") continue;
    const balance = remainingCents({ ...fee, status }, related);
    if (status === "overdue") {
      overdueCents += balance;
      overdueCount += 1;
    } else {
      pendingCents += balance;
      pendingCount += 1;
    }
  }

  const names = new Map(input.activities.map((activity) => [activity.id, activity.name]));
  const enrollmentCounts = new Map<string, number>();
  const activeStudents = new Set<string>();
  for (const enrollment of input.enrollments) {
    if (enrollment.status !== "active") continue;
    activeStudents.add(enrollment.studentId);
    enrollmentCounts.set(enrollment.activityId, (enrollmentCounts.get(enrollment.activityId) ?? 0) + 1);
  }

  const revenue = revenueByMethod(input.payments);
  return {
    revenueCents: revenue.mercadopago + revenue.efectivo,
    revenueByMethod: revenue,
    pendingCents,
    overdueCents,
    pendingCount,
    overdueCount,
    activeStudents: activeStudents.size,
    enrollmentsByActivity: input.activities.map((activity) => ({
      activityId: activity.id,
      name: activity.name,
      count: enrollmentCounts.get(activity.id) ?? 0,
    })),
    attendanceByActivity: input.attendance.map((row) => {
      const expected = row.sessions * row.enrolled;
      return {
        activityId: row.activityId,
        name: names.get(row.activityId) ?? row.activityId,
        marks: row.marks,
        expected,
        rate: attendanceRate(row.marks, expected),
      };
    }),
    cashByAdmin: reconcileCash(input.payments, input.cashFrom, input.cashTo),
  };
}

export function toCsv(headers: string[], rows: string[][]): string {
  const escape = (value: string) => {
    if (/[",\n]/.test(value)) return `"${value.replaceAll('"', '""')}"`;
    return value;
  };
  return [headers, ...rows].map((row) => row.map(escape).join(",")).join("\n");
}
