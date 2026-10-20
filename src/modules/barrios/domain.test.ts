import { describe, expect, it } from "vitest";
import { activePublicSlug, EL_TALAR_ID, NORDELTA_ID, resolveBarrio, roleAllows, slugifyBarrio } from "./domain";

const barrios = [
  { id: EL_TALAR_ID, slug: "el-talar", name: "El Talar" },
  { id: NORDELTA_ID, slug: "club-nordelta", name: "Club Nordelta" },
];

describe("barrio resolution", () => {
  it("uses the profile barrio when a super admin has not chosen one", () => {
    expect(
      resolveBarrio({
        profileRole: "super_admin",
        cookie: null,
        currentBarrioId: EL_TALAR_ID,
        memberships: [{ barrio_id: EL_TALAR_ID, role: "admin" }],
        barrios,
      }),
    ).toEqual({ role: "super_admin", barrioId: EL_TALAR_ID });
  });

  it("uses the first barrio when there is no profile barrio", () => {
    expect(
      resolveBarrio({
        profileRole: "super_admin",
        cookie: "todos",
        currentBarrioId: null,
        memberships: [],
        barrios,
      }).barrioId,
    ).toBe(EL_TALAR_ID);
    expect(
      resolveBarrio({
        profileRole: "student",
        cookie: null,
        currentBarrioId: null,
        memberships: [],
        barrios,
      }).barrioId,
    ).toBe(EL_TALAR_ID);
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

  it("falls back to the profile barrio and then the first membership", () => {
    expect(
      resolveBarrio({
        profileRole: "student",
        cookie: null,
        currentBarrioId: NORDELTA_ID,
        memberships: [
          { barrio_id: EL_TALAR_ID, role: "student" },
          { barrio_id: NORDELTA_ID, role: "student" },
        ],
        barrios,
      }).barrioId,
    ).toBe(NORDELTA_ID);
    expect(
      resolveBarrio({
        profileRole: "student",
        cookie: null,
        currentBarrioId: null,
        memberships: [{ barrio_id: NORDELTA_ID, role: "student" }],
        barrios,
      }).barrioId,
    ).toBe(NORDELTA_ID);
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

  it("picks the signed-in barrio, then the cookie, then the first public barrio", () => {
    expect(activePublicSlug("el-talar", "club-nordelta", ["el-talar", "club-nordelta"])).toBe("club-nordelta");
    expect(activePublicSlug("el-talar", null, ["club-nordelta"])).toBe("el-talar");
    expect(activePublicSlug(null, null, ["club-nordelta", "el-talar"])).toBe("club-nordelta");
    expect(activePublicSlug("todos", null, ["el-talar"])).toBe("el-talar");
  });
});
