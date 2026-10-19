import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const migration = readFileSync(
  new URL("../../../supabase/migrations/20261019043000_barrios_memberships_avatars.sql", import.meta.url),
  "utf8",
);

describe("barrio migration", () => {
  it("scopes tenant data and keeps cash admin-only", () => {
    expect(migration).toContain("private.sees_barrio");
    expect(migration).toContain("private.is_barrio_admin");
    expect(migration).toContain("private.is_super_admin");
    expect(migration).toContain("activities_barrio_slug_uidx");
    expect(migration).toContain("method = 'efectivo'");
    expect(migration).toContain("method = 'mercadopago'");
    expect(migration).not.toContain("transferencia");
    expect(migration).toContain("el-talar");
    expect(migration).toContain("santiago.errecalde@musicalclub.test");
    expect(migration).toContain("gaby.bibas@musicalclub.test");
  });

  it("lets each user write only their own avatar", () => {
    expect(migration).toContain("avatars_public_read");
    expect(migration).toContain("avatars_owner_insert");
    expect(migration).toContain("avatars_owner_update");
    expect(migration).toContain("avatars_owner_delete");
    expect(migration).toContain("(storage.foldername(name))[1] = auth.uid()::text");
  });

  it("does not authorize with user metadata", () => {
    expect(migration).toContain("barrio_slug");
    expect(migration).not.toContain("user_metadata");
    expect(migration).toContain("raw_user_meta_data");
  });

  it("backfills payments before the old guard can reject them", () => {
    const backfill = migration.indexOf("update public.payments");
    expect(migration.indexOf("request.jwt.claim.role")).toBeGreaterThan(-1);
    expect(migration.indexOf("request.jwt.claim.role")).toBeLessThan(backfill);
    expect(migration.indexOf("disable trigger payments_guard")).toBeLessThan(backfill);
    expect(migration.indexOf("enable trigger payments_guard")).toBeGreaterThan(backfill);
  });

  it("lets a teacher read student profiles without membership RLS hiding the join", () => {
    const fn = migration.indexOf("function private.can_read_profile");
    expect(fn).toBeGreaterThan(-1);
    expect(migration.slice(fn, fn + 500)).toContain("security definer");
    expect(migration).toContain("using (private.can_read_profile(id))");
    expect(migration).toContain("mine.role = 'teacher' and theirs.role = 'student'");
  });
});

const advisor = readFileSync(
  new URL("../../../supabase/migrations/20261019120000_rls_initplan_fk_indexes.sql", import.meta.url),
  "utf8",
);

describe("advisor follow-up migration", () => {
  it("wraps auth helpers and covers foreign keys", () => {
    const sql = advisor
      .split("\n")
      .filter((line) => !line.trim().startsWith("--"))
      .join("\n");
    for (const token of ["auth.uid()", "auth.role()"]) {
      let cursor = 0;
      while (cursor < sql.length) {
        const at = sql.indexOf(token, cursor);
        if (at < 0) break;
        expect(sql.slice(Math.max(0, at - 8), at)).toContain("(select ");
        cursor = at + token.length;
      }
    }
    expect(advisor).toContain("private.can_read_profile");
    expect(advisor).toContain("profiles_current_barrio_idx");
    expect(advisor).toContain("payments_received_by_idx");
    expect(advisor).toContain("attendance_enrollment_idx");
  });
});
