import { createClient } from "@libsql/client";
import path from "path";
import { schema } from "../src/lib/db/schema";

async function main() {
  const dbPath = process.env.KB_DB_PATH ?? path.join(process.cwd(), "kb-vault", ".index.db");
  console.log(`Initializing database at ${dbPath}`);

  const db = createClient({ url: `file:${dbPath}` });

  const statements = schema
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);

  for (const stmt of statements) {
    await db.execute(stmt + ";");
  }

  console.log("Database initialized successfully.");

  // Verify
  const tables = await db.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;");
  console.log("Tables:", tables.rows.map((r) => r.name).join(", "));

  await db.close();
}

main().catch(console.error);
