export function canEnroll(occupied: number, capacity: number): boolean {
  return occupied < capacity;
}

export function feesToVoidOnCancel(
  fees: { id: string; status: string }[],
  payments: { feeId: string; status: string }[],
): string[] {
  return fees
    .filter((fee) => {
      if (fee.status !== "pending" && fee.status !== "overdue") return false;
      return !payments.some((payment) => payment.feeId === fee.id && payment.status === "approved");
    })
    .map((fee) => fee.id);
}
