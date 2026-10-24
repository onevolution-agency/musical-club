import { describe, expect, it } from "vitest";
import { kidBirthOk, releasedProfileId, resolveActiveStudent, splitName } from "./domain";

describe("kid age", () => {
  const today = "2026-10-24";

  it("accepts ages 6 through 12", () => {
    expect(kidBirthOk("2020-10-24", today)).toBe(true);
    expect(kidBirthOk("2014-10-25", today)).toBe(true);
    expect(kidBirthOk("2018-03-01", today)).toBe(true);
  });

  it("rejects 5, a 13th birthday, and bad dates", () => {
    expect(kidBirthOk("2020-10-25", today)).toBe(false);
    expect(kidBirthOk("2013-10-24", today)).toBe(false);
    expect(kidBirthOk("2013-10-23", today)).toBe(false);
    expect(kidBirthOk("24-10-2018", today)).toBe(false);
    expect(kidBirthOk("2018-02-31", today)).toBe(false);
  });
});

describe("active student", () => {
  const self = "parent";
  const kids = ["lola", "theo"];

  it("opens the first child, keeps yo, and ignores unknown ids", () => {
    expect(resolveActiveStudent(null, self, kids)).toEqual({ id: "lola", self: false });
    expect(resolveActiveStudent("yo", self, kids)).toEqual({ id: self, self: true });
    expect(resolveActiveStudent("theo", self, kids)).toEqual({ id: "theo", self: false });
    expect(resolveActiveStudent("otro", self, kids)).toEqual({ id: "lola", self: false });
    expect(resolveActiveStudent(null, self, [])).toEqual({ id: self, self: true });
  });
});

describe("release", () => {
  it("keeps the same profile id", () => {
    expect(releasedProfileId("d4444444-4444-4444-8444-000000000001")).toBe("d4444444-4444-4444-8444-000000000001");
    expect(splitName("Lola Herrera")).toEqual({ firstName: "Lola", lastName: "Herrera" });
  });
});
