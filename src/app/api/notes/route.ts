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
    let where = "";
    const params: (string | number)[] = [];

    if (category) {
      where = "WHERE category = ?";
      params.push(category);
    }

    const countResult = await db.execute({ sql: `SELECT COUNT(*) as total FROM notes ${where}`, args: params });
    const total = countResult.rows[0]?.total as number;

    const offset = (page - 1) * limit;
    const notes = await db.execute({
      sql: `SELECT * FROM notes ${where} ORDER BY ${sort === "title" ? "title ASC" : "modified_at DESC"} LIMIT ? OFFSET ?`,
      args: [...params, limit, offset],
    });

    return NextResponse.json({
      notes: notes.rows,
      total,
      page,
      limit,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { path: relPath, title, content, category, tags } = body;

    if (!title) {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    const notePath = relPath || `inbox/${title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")}.md`;
    const fm: Record<string, unknown> = {};
    if (tags) fm.tags = tags;
    if (category) fm.source = category;

    const note = createNote(notePath, title, content ?? "", fm);
    return NextResponse.json({ note }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
