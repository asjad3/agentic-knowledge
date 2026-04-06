import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const q = searchParams.get("q");

    if (!q || q.trim().length === 0) {
      return NextResponse.json({ results: [] });
    }

    const db = getDb();
    const rows = await db.execute({
      sql: `SELECT n.id, n.file_path, n.title, n.modified_at, n.category,
             snippet(notes_fts, -1, '<mark>', '</mark>', '...', 30) as snippet
      FROM notes_fts
      JOIN notes n ON notes_fts.rowid = n.id
      WHERE notes_fts MATCH ?
      ORDER BY rank
      LIMIT 50`,
      args: [q],
    });

    const results = rows.rows.map((r) => ({
      id: r.id,
      file_path: r.file_path,
      title: (r.title as string) || "",
      modified_at: r.modified_at,
      category: r.category,
      snippet: r.snippet,
    }));

    return NextResponse.json({ results });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
