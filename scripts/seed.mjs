import { readFile } from "node:fs/promises";
import { Client } from "pg";

const connectionString =
  process.env.DATABASE_URL ||
  process.env.SUPABASE_DB_URL ||
  "postgresql://postgres:postgres@127.0.0.1:54322/postgres";

const sql = await readFile(new URL("../supabase/seed.sql", import.meta.url), "utf8");
const hosted = /supabase\.(co|com)/.test(connectionString);
const client = new Client({
  connectionString,
  ssl: hosted ? { rejectUnauthorized: false } : undefined,
});

try {
  await client.connect();
  await client.query(sql);
} catch (error) {
  const message = error instanceof Error ? error.message : String(error);
  console.error(message);
  console.error(
    "\nLocal: levantá Supabase (`supabase start`) o corré `supabase db reset`, que ya ejecuta supabase/seed.sql.\n" +
      "Remoto: definí DATABASE_URL con la connection string de Postgres (Settings → Database) y volvé a correr `npm run seed`.",
  );
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}

if (!process.exitCode) {
  console.log("Seed listo. Contraseña de todas las cuentas demo: MusicalClub2026");
  console.log("El listado de mails está en el README, sección Cuentas de prueba.");
}
