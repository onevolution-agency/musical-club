import { describe, expect, it } from "vitest";
import { EL_TALAR_ID, NORDELTA_ID, resolveBarrio, roleAllows, slugifyBarrio } from "./domain";

const barrios = [
  { id: EL_TALAR_ID, slug: "el-talar", name: "El Talar" },
  { id: NORDELTA_ID, slug: "club-nordelta", name: "Club Nordelta" },
];

describe("barrio resolution", () => {
  it("lets a super admin see every barrio until they pick one", () => {
    expect(
      resolveBarrio({
        profileRole: "super_admin",
        cookie: null,
        currentBarrioId: EL_TALAR_ID,
        memberships: [{ barrio_id: EL_TALAR_ID, role: "admin" }],
        barrios,
      }),
    ).toEqual({ role: "super_admin", barrioId: null });
  });

  it("filters a super admin to the chosen barrio", () => {
    expect(
      resolveBarrio({
        profileRole: "super_admin",
        cookie: "club-nordelta",
        currentBarrioId: null,
        memberships: [],
        barrios,
      }).barrioId,
    ).toBe(NORDELTA_ID);
  });

  it("uses the membership role of the barrio a teacher belongs to", () => {
    const resolved = resolveBarrio({
      profileRole: "teacher",
      cookie: "club-nordelta",
      currentBarrioId: EL_TALAR_ID,
      memberships: [
        { barrio_id: EL_TALAR_ID, role: "teacher" },
        { barrio_id: NORDELTA_ID, role: "teacher" },
      ],
      barrios,
    });
    expect(resolved).toEqual({ role: "teacher", barrioId: NORDELTA_ID });
  });

  it("ignores a cookie for a barrio the person does not belong to", () => {
    const resolved = resolveBarrio({
      profileRole: "student",
      cookie: "club-nordelta",
      currentBarrioId: EL_TALAR_ID,
      memberships: [{ barrio_id: EL_TALAR_ID, role: "student" }],
      barrios,
    });
    expect(resolved.barrioId).toBe(EL_TALAR_ID);
    expect(resolved.role).toBe("student");
  });

  it("treats super admins as admins for guarded routes", () => {
    expect(roleAllows("super_admin", ["admin"])).toBe(true);
    expect(roleAllows("teacher", ["admin"])).toBe(false);
    expect(roleAllows("student", ["student", "admin"])).toBe(true);
  });

  it("slugifies barrio names", () => {
    expect(slugifyBarrio("Club Nordelta")).toBe("club-nordelta");
  });
});
