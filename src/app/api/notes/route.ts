import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { createNote } from "@/lib/fs/notes";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;
    const page = parseInt(searchParams.get("page") ?? "1");
    const limit = parseInt(searchParams.get("limit") ?? "20");
    const sort = searchParams.get("sort") ?? "modified_at";
    const category = searchParams.get("category");

    const db = getDb();

    if (category) {
      const countResult = await db.execute({ sql: "SELECT COUNT(*) as total FROM notes WHERE category = ?", args: [category] });
      const total = countResult.rows[0]?.total as number;
      const offset = (page - 1) * limit;
      const notes = await db.execute({
        sql: `SELECT * FROM notes WHERE category = ? ORDER BY ${sort === "title" ? "title ASC" : "modified_at DESC"} LIMIT ${limit} OFFSET ${offset}`,
        args: [category],
      });
      return NextResponse.json({ notes: notes.rows, total, page, limit });
    } else {
      const countResult = await db.execute({ sql: "SELECT COUNT(*) as total FROM notes", args: [] });
      const total = countResult.rows[0]?.total as number;
      const offset = (page - 1) * limit;
      const notes = await db.execute({
        sql: `SELECT * FROM notes ORDER BY ${sort === "title" ? "title ASC" : "modified_at DESC"} LIMIT ${limit} OFFSET ${offset}`,
        args: [],
      });
      return NextResponse.json({ notes: notes.rows, total, page, limit });
    }
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: relPath, title, content } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const notePath = relPath || `inbox/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.md`;
    const note = await createNote(notePath, title, content ?? "");
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
