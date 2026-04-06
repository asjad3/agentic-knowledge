import fs from "fs";
import path from "path";
import type { InValue } from "@libsql/client";
import { ensureVault } from "@/lib/fs/vault";
import { writeNote, readNote, deleteNote } from "@/lib/fs/notes";
import { getDb, dbAll } from "@/lib/db";
import type { Memory, CreateMemoryInput, UpdateMemoryInput, ListMemoryFilters, MemoryTypeInfo, MemoryType } from "./types";

const MEMORY_TYPES: Record<string, string> = {
  user: "Information about the user's role, preferences, responsibilities, and knowledge",
  feedback: "Guidance the user has given about how to approach work — what to avoid and what to keep doing",
  project: "Information about ongoing work, goals, initiatives, bugs, or incidents",
  reference: "Pointers to where information can be found in external systems",
  session: "Conversation summaries and session context",
};

function generateId(): string {
  return crypto.randomUUID().slice(0, 8);
}

export function slugify(title: string): string {
  if (!title) return generateId();
  const base = title
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/[\s_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60);
  return base || generateId();
}

export async function getMemoryTypes(): Promise<MemoryTypeInfo[]> {
  const types: MemoryTypeInfo[] = Object.entries(MEMORY_TYPES).map(([name, description]) => ({
    name: name as MemoryTypeInfo["name"],
    description,
    count: 0,
  }));
  const vaultPath = ensureVault();
  const dir = path.join(vaultPath, "memories");
  if (!fs.existsSync(dir)) return types;

  for (const t of types) {
    const tDir = path.join(dir, t.name);
    if (fs.existsSync(tDir)) {
      t.count = fs.readdirSync(tDir).filter((f) => f.endsWith(".md")).length;
    }
  }
  return types;
}

export async function createMemory(input: CreateMemoryInput): Promise<Memory> {
  if (!input.content || !input.content.trim()) {
    throw new Error("Memory content is required");
  }
  if (!MEMORY_TYPES[input.type]) {
    throw new Error(`Invalid memory type: ${input.type}. Must be one of: ${Object.keys(MEMORY_TYPES).join(", ")}`);
  }

  const baseSlug = slugify(input.title ?? "");
  const fileName = `${baseSlug}.md`;
  const filePath = path.join("memories", input.type, fileName);

  const now = new Date().toISOString();
  const frontmatter: Record<string, unknown> = {
    title: input.title || baseSlug,
    slug: baseSlug,
    created: now,
    modified: now,
    tags: input.tags ?? [],
    category: `memories/${input.type}`,
    source: input.agent ?? "claude",
    memory_type: input.type,
    agent: input.agent ?? "claude",
  };

  if (input.session) frontmatter.session = input.session;
  if (input.project) frontmatter.project = input.project;
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) {
      if (!(k in frontmatter)) frontmatter[k] = v;
    }
  }

  await writeNote(filePath.split(path.sep), input.content.trim(), frontmatter);

  const relPath = filePath;
  const db = getDb();
  const res = await db.execute({ sql: "SELECT id FROM notes WHERE file_path = ?", args: [relPath] });
  const noteId = res.rows[0]?.id as number;

  return {
    slug: baseSlug,
    type: input.type,
    title: input.title ?? baseSlug,
    content: input.content.trim(),
    tags: input.tags ?? [],
    agent: input.agent ?? "claude",
    session: input.session,
    project: input.project,
    created_at: now,
    modified_at: now,
    frontmatter,
  };
}

export async function readMemory(type: string, slug: string): Promise<Memory | null> {
  const filePath = path.join("memories", type, `${slug}.md`);
  const note = await readNote(filePath.split(path.sep));
  if (!note) return null;

  // Read from DB for id
  const db = getDb();
  const res = await db.execute({ sql: "SELECT id FROM notes WHERE file_path = ?", args: [filePath] });
  const noteId = res.rows[0]?.id as number;

  return {
    slug,
    type: type as Memory["type"],
    title: note.title,
    content: note.content,
    tags: note.tags,
    agent: (note.frontmatter.agent as string) ?? "claude",
    session: note.frontmatter.session as string | undefined,
    project: note.frontmatter.project as string | undefined,
    created_at: note.created_at,
    modified_at: note.modified_at,
    frontmatter: note.frontmatter,
  };
}

export async function updateMemory(
  type: string,
  slug: string,
  input: UpdateMemoryInput,
): Promise<Memory> {
  const filePath = path.join("memories", type, `${slug}.md`);
  const existing = await readNote(filePath.split(path.sep));
  if (!existing) {
    throw new Error(`Memory not found: ${type}/${slug}`);
  }

  const fm: Record<string, unknown> = { ...existing.frontmatter };
  if (input.title) { fm.title = input.title; }
  if (input.tags) { fm.tags = input.tags; }
  if (input.project) { fm.project = input.project; }
  fm.modified = new Date().toISOString();
  if (input.metadata) {
    for (const [k, v] of Object.entries(input.metadata)) {
      fm[k] = v;
    }
  }

  const content = input.content ?? existing.content;
  await writeNote(filePath.split(path.sep), content, fm);

  const mem = await readMemory(type, slug);
  if (!mem) throw new Error("Failed to read updated memory");
  return mem;
}

export async function deleteMemory(type: string, slug: string): Promise<boolean> {
  const filePath = path.join("memories", type, `${slug}.md`);
  return deleteNote(filePath.split(path.sep));
}

export async function listMemories(filters: ListMemoryFilters = {}): Promise<Memory[]> {
  let query = `
    SELECT notes.*, GROUP_CONCAT(tags.name) as tag_list
    FROM notes
    LEFT JOIN note_tags ON note_tags.note_id = notes.id
    LEFT JOIN tags ON tags.id = note_tags.tag_id
    WHERE 1=1
  `;
  const args: InValue[] = [];

  if (filters.type) {
    query += " AND notes.memory_type = ?";
    args.push(filters.type);
  } else {
    query += " AND notes.memory_type IS NOT NULL";
  }

  if (filters.tag) {
    query += " AND notes.id IN (SELECT note_id FROM note_tags WHERE tag_id = (SELECT id FROM tags WHERE name = ?))";
    args.push(filters.tag.toLowerCase());
  }
  if (filters.project) {
    query += " AND instr(LOWER(notes.file_path), LOWER(?)) > 0";
    args.push(filters.project);
  }
  if (filters.agent) {
    query += " AND LOWER(notes.source) = LOWER(?)";
    args.push(filters.agent);
  }

  query += " GROUP BY notes.id ORDER BY notes.modified_at DESC LIMIT ? OFFSET ?";
  args.push(filters.limit ?? 50, filters.offset ?? 0);

  const rows = await dbAll(query, args);

  return rows.map((row) => ({
    slug: (row.slug as string) || path.basename(row.file_path as string, ".md"),
    type: (row.memory_type as Memory["type"]) ?? "user",
    title: row.title as string,
    content: "",
    tags: (row.tag_list as string)?.split(",").filter(Boolean) ?? [],
    agent: (row.source as string) ?? "claude",
    session: undefined,
    project: undefined,
    created_at: row.created_at as string,
    modified_at: row.modified_at as string,
    frontmatter: {},
  }));
}

export async function searchMemories(query: string, filters: { type?: MemoryType; limit?: number } = {}): Promise<{ title: string; slug: string; type: string; file_path: string; modified_at: string; agent: string }[]> {
  const safeQuery = escapeFts(query);
  let sql = `
    SELECT notes.title, notes.slug, notes.memory_type, notes.file_path, notes.modified_at, notes.source, notes_fts.rank
    FROM notes_fts
    JOIN notes ON notes_fts.rowid = notes.id
    WHERE notes_fts MATCH ? AND notes.memory_type IS NOT NULL
    ORDER BY notes_fts.rank ASC
    LIMIT ?
  `;
  const args: InValue[] = [safeQuery, filters.limit ?? 20];

  if (filters.type) {
    sql = `
      SELECT notes.title, notes.slug, notes.memory_type, notes.file_path, notes.modified_at, notes.source, notes_fts.rank
      FROM notes_fts
      JOIN notes ON notes_fts.rowid = notes.id
      WHERE notes_fts MATCH ? AND notes.memory_type = ?
      ORDER BY notes_fts.rank ASC
      LIMIT ?
    `;
    args.splice(1, 1, filters.type, filters.limit ?? 20);
  }

  const db = getDb();
  const result = await db.execute({ sql, args });

  return result.rows.map((row) => ({
    title: row.title as string,
    slug: row.slug as string,
    type: (row.memory_type as string) ?? "user",
    file_path: row.file_path as string,
    modified_at: row.modified_at as string,
    agent: (row.source as string) ?? "claude",
  }));
}

function escapeFts(q: string): string {
  return q.replace(/["*]/g, "").trim();
}
