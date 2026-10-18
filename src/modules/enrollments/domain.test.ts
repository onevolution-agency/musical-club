import { describe, expect, it } from "vitest";
import { canEnroll, feesToVoidOnCancel } from "./domain";

describe("enrollments", () => {
  it("blocks enrollment when capacity is full", () => {
    expect(canEnroll(10, 10)).toBe(false);
    expect(canEnroll(9, 10)).toBe(true);
  });

  it("voids only unpaid pending or overdue fees on cancel", () => {
    expect(
      feesToVoidOnCancel(
        [
          { id: "a", status: "pending" },
          { id: "b", status: "overdue" },
          { id: "c", status: "paid" },
          { id: "d", status: "partial" },
        ],
        [{ feeId: "b", status: "approved" }],
      ),
    ).toEqual(["a"]);
  });
});
