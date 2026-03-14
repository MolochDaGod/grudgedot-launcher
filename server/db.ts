import "./env";
import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";
import * as schema from "../shared/schema";

// Schema-aware db type helper
function _createDb(client: mysql.Pool) { return drizzle({ client, schema, mode: "default" }); }
type DbType = ReturnType<typeof _createDb>;

let _pool: mysql.Pool | null = null;
let _db: DbType | null = null;

function getPool(): mysql.Pool {
  if (!_pool) {
    if (!process.env.DATABASE_URL) {
      throw new Error(
        "DATABASE_URL must be set. Did you forget to provision a database?",
      );
    }
    _pool = mysql.createPool({
      uri: process.env.DATABASE_URL,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
    });
  }
  return _pool;
}

function getDb(): DbType {
  if (!_db) {
    _db = drizzle({ client: getPool(), schema, mode: "default" });
  }
  return _db;
}

/** Whether a database connection is configured */
export function isDatabaseConfigured(): boolean {
  return !!process.env.DATABASE_URL;
}

// Lazy proxies — only connect when first accessed
export const pool = new Proxy({} as mysql.Pool, {
  get(_target, prop) {
    return Reflect.get(getPool(), prop);
  },
});

export const db = new Proxy({} as DbType, {
  get(_target, prop) {
    return Reflect.get(getDb(), prop);
  },
});
