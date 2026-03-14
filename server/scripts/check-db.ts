import "../env";
import mysql from "mysql2/promise";

async function main() {
  const conn = await mysql.createConnection(process.env.DATABASE_URL!);
  const tables = ["openrts_units", "openrts_weapons", "openrts_movers", "openrts_effects", "accounts", "grudge_characters"];
  for (const t of tables) {
    try {
      const [rows] = await conn.execute(`SELECT count(*) as cnt FROM ${t}`) as any;
      console.log(`${t}: ${rows[0].cnt} rows`);
    } catch (e: any) {
      console.log(`${t}: ERROR - ${e.message}`);
    }
  }
  await conn.end();
}
main();
