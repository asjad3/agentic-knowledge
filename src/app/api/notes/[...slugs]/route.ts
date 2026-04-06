import { NextRequest, NextResponse } from "next/server";
import { readNote, writeNote, deleteNote } from "@/lib/fs/notes";
import { evaluateRules } from "@/lib/rules/engine";
import { getAllRules } from "@/lib/rules/db";

type Params = { slugs: string[] };

export async function GET(_request: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { slugs } = await params;
    const note = readNote(slugs);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json({ note });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { slugs } = await params;
    const body = await request.json();
    const { content, frontmatter } = body;

    if (content === undefined) {
      return NextResponse.json({ error: "Content is required" }, { status: 400 });
    }

    const note = readNote(slugs);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const fm = frontmatter ?? note.frontmatter ?? {};
    writeNote(slugs, content, fm);

    const updated = readNote(slugs)!;
    return NextResponse.json({ note: updated });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { slugs } = await params;
    const body = await request.json();

    const note = readNote(slugs);
    if (!note) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }

    const fm = { ...note.frontmatter };

    if (body.title !== undefined) fm.title = body.title;
    if (body.tags !== undefined) fm.tags = body.tags;
    if (body.category !== undefined) fm.category = body.category;
    if (body.pinned !== undefined) fm.pinned = body.pinned;

    const contentBody = body.content ?? note.content;
    writeNote(slugs, contentBody, fm);

    if (body.tags !== undefined || body.category !== undefined) {
      const rules = await getAllRules();
      const updatedNote = readNote(slugs)!;
      evaluateRules(updatedNote, rules);
    }

    const updated = readNote(slugs)!;
    return NextResponse.json({ note: updated });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<Params> }) {
  try {
    const { slugs } = await params;
    const success = deleteNote(slugs);
    if (!success) {
      return NextResponse.json({ error: "Note not found" }, { status: 404 });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
