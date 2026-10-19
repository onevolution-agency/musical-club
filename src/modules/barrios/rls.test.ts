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
});
