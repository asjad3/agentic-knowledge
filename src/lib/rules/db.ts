import { getDb, dbAll, dbRun, dbGet } from "@/lib/db";
import type { Rule } from "@/types";

export async function getAllRules(): Promise<Rule[]> {
  const rows = await dbAll("SELECT * FROM rules ORDER BY priority DESC");
  return rows.map(rowToRule);
}

export async function createRule(data: Omit<Rule, "id" | "created_at">): Promise<Rule> {
  const db = getDb();
  const result = await db.execute({
    sql: "INSERT INTO rules (name, description, condition, action, enabled, priority, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)",
    args: [data.name, data.description, JSON.stringify(data.condition), JSON.stringify(data.action), data.enabled ? 1 : 0, data.priority, new Date().toISOString()],
  });
  const row = await db.execute({
    sql: "SELECT * FROM rules WHERE id = ?",
    args: [Number(result.lastInsertRowid)],
  });
  return rowToRule(row.rows[0]!);
}

export async function updateRule(id: number, data: Partial<Rule>): Promise<Rule | null> {
  const sets: string[] = [];
  const vals: (string | number | null)[] = [];

  if (data.name !== undefined) { sets.push("name = ?"); vals.push(data.name); }
  if (data.description !== undefined) { sets.push("description = ?"); vals.push(data.description); }
  if (data.condition !== undefined) { sets.push("condition = ?"); vals.push(JSON.stringify(data.condition)); }
  if (data.action !== undefined) { sets.push("action = ?"); vals.push(JSON.stringify(data.action)); }
  if (data.enabled !== undefined) { sets.push("enabled = ?"); vals.push(data.enabled ? 1 : 0); }
  if (data.priority !== undefined) { sets.push("priority = ?"); vals.push(data.priority); }

  if (sets.length === 0) return null;
  vals.push(id);

  const sql = `UPDATE rules SET ${sets.join(", ")} WHERE id = ?`;
  await dbRun(sql, vals);
  const row = await dbGet("SELECT * FROM rules WHERE id = ?", [id]);
  return row ? rowToRule(row) : null;
}

export async function deleteRuleFn(id: number): Promise<boolean> {
  await dbRun("DELETE FROM rules WHERE id = ?", [id]);
  const row = await dbGet("SELECT id FROM rules WHERE id = ?", [id]);
  return !row;
}

function rowToRule(row: Record<string, unknown>): Rule {
  return {
    id: row.id as number,
    name: row.name as string,
    description: row.description as string,
    condition: JSON.parse(row.condition as string),
    action: JSON.parse(row.action as string),
    enabled: Boolean(row.enabled),
    priority: row.priority as number,
    created_at: row.created_at as string,
  };
}
