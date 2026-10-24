import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("../../../supabase/migrations/20261024120000_kids_guardians.sql", import.meta.url), "utf8");

function body(name: string): string {
  const start = sql.indexOf(`function public.${name}`);
  expect(start).toBeGreaterThan(-1);
  const next = sql.indexOf("\ncreate or replace function", start + 10);
  return sql.slice(start, next === -1 ? sql.length : next);
}

describe("kids migration", () => {
  it("wraps auth helpers", () => {
    const code = sql
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");
    for (const token of ["auth.uid()", "auth.role()"]) {
      let cursor = 0;
      while (cursor < code.length) {
        const at = code.indexOf(token, cursor);
        if (at < 0) break;
        expect(code.slice(Math.max(0, at - 8), at)).toContain("(select ");
        cursor = at + token.length;
      }
    }
  });

  it("keeps kids off auth until release, and release keeps the profile id", () => {
    expect(sql).toContain("account_kind in ('user', 'kid')");
    expect(sql).toContain("drop constraint if exists profiles_id_fkey");
    expect(sql).toContain("private.manages_child");
    expect(sql).toContain("private.kid_birth_ok");
    expect(sql).toContain("public.guardianships");
    expect(sql).toContain("public.guardian_audit");
    expect(sql).toContain("access in ('manager', 'contact')");
    expect(sql).toContain("action in ('create', 'link', 'unlink', 'release')");
    const release = body("release_child");
    expect(release).toContain("child");
    expect(release).toContain("insert into auth.users");
    expect(release).toContain("set access = 'contact'");
    expect(release).toContain("'release'");
    expect(release.toLowerCase()).not.toContain("delete from public.enrollments");
    expect(release.toLowerCase()).not.toContain("delete from public.fees");
    expect(release.toLowerCase()).not.toContain("delete from public.payments");
    expect(release.toLowerCase()).not.toContain("delete from public.attendance_marks");
    const unlink = body("unlink_guardian");
    expect(unlink).toContain("'unlink'");
    expect(unlink.toLowerCase()).not.toContain("delete from public.enrollments");
    expect(unlink.toLowerCase()).not.toContain("delete from public.fees");
    expect(unlink.toLowerCase()).not.toContain("delete from public.payments");
  });

  it("lets a parent pay with Mercado Pago and leaves cash to the admin", () => {
    expect(sql).toContain("method = 'mercadopago'");
    expect(sql).toContain("private.manages_child(student_id)");
    expect(sql).toContain("created_by = (select auth.uid())");
    expect(sql).not.toContain("method = 'efectivo'");
    const mp = sql.slice(sql.indexOf("payments_insert_mp"), sql.length);
    expect(mp).toContain("or private.manages_child(student_id)");
    expect(mp).not.toContain("efectivo");
  });

  it("does not open guardian tables to direct writes", () => {
    expect(sql).toContain("guardianships_select");
    expect(sql).not.toContain("policy guardianships_insert");
    expect(sql).not.toContain("policy guardianships_update");
    expect(sql).not.toContain("policy guardianships_delete");
    expect(sql).toContain("grant execute on function public.release_child");
    expect(sql).toContain("to authenticated");
  });
});
