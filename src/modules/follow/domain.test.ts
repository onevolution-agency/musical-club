import { describe, expect, it } from "vitest";
import { followLabel, teenBirthOk, turnedEighteen } from "./domain";

describe("teen age", () => {
  const today = "2026-10-24";

  it("accepts 13 through 17", () => {
    expect(teenBirthOk("2013-10-24", today)).toBe(true);
    expect(teenBirthOk("2009-10-25", today)).toBe(true);
    expect(teenBirthOk("2011-03-02", today)).toBe(true);
  });

  it("rejects 12, an 18th birthday, and empty dates", () => {
    expect(teenBirthOk("2013-10-25", today)).toBe(false);
    expect(teenBirthOk("2008-10-24", today)).toBe(false);
    expect(teenBirthOk("2008-10-23", today)).toBe(false);
    expect(teenBirthOk(null, today)).toBe(false);
    expect(turnedEighteen("2008-10-24", today)).toBe(true);
    expect(turnedEighteen("2008-10-25", today)).toBe(false);
  });
});

describe("follow label", () => {
  it("marks the parent view", () => {
    expect(followLabel("Juana Herrera")).toBe("Juana Herrera · Seguimiento");
  });
});
