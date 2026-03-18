import "./env";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import * as schema from "../shared/schema";

// Schema-aware db type helper
function _createDb(client: postgres.Sql) { return drizzle(client, { schema }); }
type DbType = ReturnType<typeof _createDb>;

let _sql: postgres.Sql | null = null;
let _db: DbType | null = null;

function getSql(): postgres.Sql {
  if (!_sql) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    _sql = postgres(process.env.DATABASE_URL, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });
  }
  return _sql;
}

function getDb(): DbType {
  if (!_db) {
    _db = drizzle(getSql(), { schema });
  }
  return _db;
}

/** Whether a database connection is configured */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

/** The raw postgres.js SQL client (lazy) */
export const sql = new Proxy({} as postgres.Sql, {
  get(_target, prop) {
    return Reflect.get(getSql(), prop);
  },
});

export const db = new Proxy({} as DbType, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
