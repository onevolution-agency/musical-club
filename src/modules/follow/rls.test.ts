import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const sql = readFileSync(new URL("../../../supabase/migrations/20261025010000_teen_follow.sql", import.meta.url), "utf8");

function body(name: string): string {
  const start = sql.indexOf(`function public.${name}`);
  expect(start).toBeGreaterThan(-1);
  const next = sql.indexOf("\ncreate or replace function", start + 10);
  return sql.slice(start, next === -1 ? sql.length : next);
}

describe("teen follow migration", () => {
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

  it("keeps the link and writes an audit row when the follow ends", () => {
    expect(sql).toContain("'follow'");
    expect(sql).toContain("teen_can_unfollow");
    expect(sql).toContain("private.follows_child");
    expect(sql).toContain("private.teen_birth_ok");
    expect(sql).toContain("private.turned_eighteen");
    expect(sql).toContain("public.follow_requests");
    expect(sql).toContain("public.guardian_notices");
    expect(sql).toContain("'absence'");
    expect(sql).toContain("'overdue'");
    const ended = `${body("expire_follows")}\n${body("end_follow")}`;
    expect(ended).toContain("ended_at = now()");
    expect(ended).toContain("'end'");
    expect(ended.toLowerCase()).not.toContain("delete from public.guardianships");
    expect(ended.toLowerCase()).not.toContain("delete from public.enrollments");
    expect(ended.toLowerCase()).not.toContain("delete from public.fees");
    expect(ended.toLowerCase()).not.toContain("delete from public.payments");
    expect(ended.toLowerCase()).not.toContain("delete from public.attendance_marks");
  });

  it("lets a follower pay with Mercado Pago and not with cash", () => {
    const mp = sql.slice(sql.indexOf("payments_insert_mp"));
    expect(mp).toContain("private.follows_child(student_id)");
    expect(mp).toContain("method = 'mercadopago'");
    expect(mp).not.toContain("efectivo");
    expect(sql).not.toContain("enrollments_insert");
    expect(sql).not.toContain("enrollments_update");
  });
});