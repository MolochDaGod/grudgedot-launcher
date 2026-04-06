import "../env";
import postgres from "postgres";

async function main() {
  const sql = postgres(process.env.DATABASE_URL!);
  const tables = ["openrts_units", "openrts_weapons", "openrts_movers", "openrts_effects", "accounts", "grudge_characters"];
  for (const t of tables) {
    try {
      const rows = await sql.unsafe(`SELECT count(*) as cnt FROM ${t}`);
      console.log(`${t}: ${rows[0].cnt} rows`);
    } catch (e: any) {
      console.log(`${t}: ERROR - ${e.message}`);
    }
  }
  await sql.end();
}
main();
