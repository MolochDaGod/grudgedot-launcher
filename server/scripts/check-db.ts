import "../env";
import { Pool } from "@neondatabase/serverless";
const pool = new Pool({ connectionString: process.env.DATABASE_URL });
async function main() {
  const tables = ["openrts_units", "openrts_weapons", "openrts_movers", "openrts_effects", "accounts", "grudge_characters"];
  for (const t of tables) {
    try {
      const { rows } = await pool.query(`SELECT count(*) as cnt FROM ${t}`);
      console.log(`${t}: ${rows[0].cnt} rows`);
    } catch (e: any) {
      console.log(`${t}: ERROR - ${e.message}`);
    }
  }
  await pool.end();
}
main();
