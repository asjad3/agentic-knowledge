import { createClient, type Client, type InValue } from "@libsql/client";
export type { InValue };
import path from "path";

let db: Client | null = null;
let migrationsApplied = false;

export function getDb(): Client {
  if (!db) {
    const dbPath = process.env.KB_DB_PATH ?? path.join(process.cwd(), "kb-vault", ".index.db");
    db = createClient({ url: `file:${dbPath}` });
    runMigrations().catch(console.error);
  }
  return db;
}

async function runMigrations() {
  if (migrationsApplied || !db) return;
  migrationsApplied = true;
  await db.execute({ sql: "ALTER TABLE notes ADD COLUMN memory_type TEXT DEFAULT NULL", args: [] }).catch(() => {});
}

export async function dbRun(sql: string, args: InValue[] = []): Promise<void> {
  const db = getDb();
  await db.execute({ sql, args });
}

export async function dbGet(sql: string, args: InValue[] = []) {
  const db = getDb();
  const res = await db.execute({ sql, args });
  return res.rows[0] ?? null;
}

export async function dbAll(sql: string, args: InValue[] = []) {
  const db = getDb();
  const res = await db.execute({ sql, args });
  return res.rows;
}
