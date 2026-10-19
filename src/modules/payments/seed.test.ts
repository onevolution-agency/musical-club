import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const seed = readFileSync(new URL("../../../supabase/seed.sql", import.meta.url), "utf8");

const accounts = [
  "santiago.errecalde@musicalclub.test",
  "gaby.bibas@musicalclub.test",
  "valentina.ruiz@musicalclub.test",
  "mateo.alvarez@musicalclub.test",
  "lucia.ferreyra@musicalclub.test",
  "sofia.herrera@musicalclub.test",
  "benjamin.castro@musicalclub.test",
  "emma.lopez@musicalclub.test",
  "thiago.romero@musicalclub.test",
  "olivia.suarez@musicalclub.test",
  "joaquin.pereyra@musicalclub.test",
  "mia.fernandez@musicalclub.test",
  "santino.diaz@musicalclub.test",
  "martina.gomez@musicalclub.test",
  "franco.iglesias@musicalclub.test",
  "camila.ortiz@musicalclub.test",
  "nicolas.vega@musicalclub.test",
  "julieta.paredes@musicalclub.test",
  "agustin.molina@musicalclub.test",
  "renata.acosta@musicalclub.test",
];

describe("demo seed", () => {
  it("documents the dev password and every test account", () => {
    expect(seed).toContain("MusicalClub2026");
    for (const email of accounts) expect(seed).toContain(email);
  });

  it("keeps only mercadopago and efectivo", () => {
    expect(seed).not.toContain("transferencia");
    expect(seed).not.toContain("'otro'");
    expect(seed).toContain("'mercadopago'");
    expect(seed).toContain("'efectivo'");
    expect(seed).toContain("REC-1048");
    expect(seed).toContain("el-talar");
    expect(seed).toContain("club-nordelta");
    expect(seed).toContain("super_admin");
    expect(seed).toContain("barrio_memberships");
  });
});
