import fs from "fs";
import path from "path";
import matter from "gray-matter";
import type { InValue } from "@libsql/client";
import { getDb } from "@/lib/db";
import { ensureVault, resolveNotePath } from "./vault";
import type { Note, TagInfo, NoteWithContent } from "@/types";

export async function readNote(slugs: string[]): Promise<NoteWithContent | null> {
  const filePath = resolveNotePath(slugs);
  if (!fs.existsSync(filePath)) return null;

  const content = fs.readFileSync(filePath, "utf-8");
  const parsed = matter(content);
  const stat = fs.statSync(filePath);

  const data = parsed.data as Record<string, unknown>;
  const title = (data.title as string) ?? path.basename(filePath, ".md").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const tags = Array.isArray(data.tags) ? data.tags as string[] : [];
  const category = (data.category as string) ?? slugs[0] ?? "inbox";

  return {
    id: 0,
    file_path: path.relative(ensureVault(), filePath),
    title,
    slug: path.basename(filePath, ".md"),
    created_at: (data.created as string) ?? stat.birthtime.toISOString(),
    modified_at: (data.modified as string) ?? stat.mtime.toISOString(),
    content_preview: parsed.content.trim().slice(0, 200),
    word_count: parsed.content.trim().split(/\s+/).filter(Boolean).length,
    category,
    source: (data.source as string) ?? "manual",
    source_url: (data.source_url as string) ?? "",
    pinned: Boolean(data.pinned),
    content: parsed.content,
    tags,
    frontmatter: data,
  };
}

export async function writeNote(
  slugs: string[],
  contentBody: string,
  frontmatter: Record<string, unknown> = {},
): Promise<void> {
  const vaultPath = ensureVault();
  const filePath = path.join(vaultPath, ...slugs);

  fs.mkdirSync(path.dirname(filePath), { recursive: true });

  const fm: Record<string, unknown> = { ...frontmatter, modified: new Date().toISOString() };
  if (!fm.created) fm.created = fm.modified;

  const fileContent = matter.stringify(contentBody, fm);
  fs.writeFileSync(filePath, fileContent, "utf-8");
  await upsertNoteToDb(filePath, contentBody, fm);
}

export async function createNote(
  relativePath: string,
  title: string,
  content: string = "",
  initialFm: Record<string, unknown> = {},
): Promise<NoteWithContent> {
  const vaultPath = ensureVault();
  const filePath = path.join(vaultPath, relativePath);
  const slug = path.basename(filePath, ".md");
  const dir = path.dirname(filePath);
  const category = relativePath.split(path.sep)[0] ?? "inbox";
  const now = new Date().toISOString();

  const fm: Record<string, unknown> = {
    title,
    slug,
    created: now,
    modified: now,
    tags: initialFm.tags ?? [],
    category,
    source: (initialFm.source as string) ?? "manual",
    source_url: initialFm.source_url ?? "",
    pinned: initialFm.pinned ?? false,
  };

  const fileContent = matter.stringify(content, fm);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, fileContent, "utf-8");
  await upsertNoteToDb(filePath, content, fm);

  return (await readNote(relativePath.split(path.sep)))!;
}

export async function deleteNote(slugs: string[]): Promise<boolean> {
  const filePath = resolveNotePath(slugs);
  if (!fs.existsSync(filePath)) return false;
  fs.unlinkSync(filePath);

  const relPath = path.relative(ensureVault(), filePath);
  const db = getDb();
  await db.execute({ sql: "DELETE FROM note_tags WHERE note_id = (SELECT id FROM notes WHERE file_path = ?)", args: [relPath] });
  await db.execute({ sql: "DELETE FROM notes WHERE file_path = ?", args: [relPath] });
  await db.execute({ sql: "DELETE FROM notes_fts WHERE rowid = (SELECT id FROM notes WHERE file_path = ?)", args: [relPath] });
  return true;
}

export async function listTags(): Promise<TagInfo[]> {
  const db = getDb();
  const res = await db.execute({ sql: "SELECT t.name, COUNT(nt.note_id) as count FROM tags t JOIN note_tags nt ON t.id = nt.tag_id GROUP BY t.name ORDER BY count DESC, t.name ASC" });
  return res.rows.map((r) => ({ name: r.name as string, count: r.count as number }));
}

async function upsertNoteToDb(
  filePath: string,
  contentBody: string,
  fm: Record<string, unknown>,
): Promise<void> {
  const vaultPath = ensureVault();
  const relPath = path.relative(vaultPath, filePath);
  const stat = fs.statSync(filePath);
  const title = (fm.title as string) ?? path.basename(filePath, ".md").replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  const slug = (fm.slug as string) ?? path.basename(filePath, ".md");
  const tags = Array.isArray(fm.tags) ? fm.tags as string[] : [];
  const category = (fm.category as string) ?? relPath.split(path.sep)[0] ?? "inbox";

  const args: InValue[] = [
    relPath,
    title,
    slug,
    (fm.created as string) ?? stat.birthtime.toISOString(),
    fm.modified as string,
    contentBody.trim().slice(0, 200),
    contentBody.trim().split(/\s+/).filter(Boolean).length,
    category,
    (fm.source as string) ?? "manual",
    (fm.source_url as string) ?? "",
    fm.pinned ? 1 : 0,
  ];

  const db = getDb();

  await db.execute({
    sql: `INSERT INTO notes (file_path, title, slug, created_at, modified_at, content_preview, word_count, category, source, source_url, pinned)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
     ON CONFLICT(file_path) DO UPDATE SET
       title=excluded.title, slug=excluded.slug, modified_at=excluded.modified_at,
       content_preview=excluded.content_preview, word_count=excluded.word_count,
       category=excluded.category, source=excluded.source, source_url=excluded.source_url, pinned=excluded.pinned`,
    args,
  });

  const noteRow = await db.execute({ sql: "SELECT id FROM notes WHERE file_path = ?", args: [relPath] });
  const noteId = noteRow.rows[0]?.id as number;
  if (noteId) {
    await db.execute({ sql: "DELETE FROM note_tags WHERE note_id = ?", args: [noteId] });
    for (const tag of tags) {
      const lcTag = tag.toLowerCase();
      await db.execute({ sql: "INSERT OR IGNORE INTO tags (name) VALUES (?)", args: [lcTag] });
      const tagRow = await db.execute({ sql: "SELECT id FROM tags WHERE name = ?", args: [lcTag] });
      const tagId = tagRow.rows[0]?.id as number;
      if (tagId) {
        await db.execute({ sql: "INSERT OR REPLACE INTO note_tags (note_id, tag_id) VALUES (?, ?)", args: [noteId, tagId] });
      }
    }
  }

  await db.execute({
    sql: "INSERT OR REPLACE INTO notes_fts (rowid, title, content) VALUES (?, ?, ?)",
    args: [noteId, title, contentBody],
  });
}
