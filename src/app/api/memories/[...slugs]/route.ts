import { NextRequest, NextResponse } from "next/server";
import path from "path";
import { readMemory, updateMemory, deleteMemory } from "@/lib/memory/memory";

type Params = { slugs: string[] };

function parseSlugs(slugs: string[]): { type: string; slug: string } | null {
  if (slugs.length < 2) return null;
  return { type: slugs[0]!, slug: slugs.slice(1).join("/") };
}

export async function GET(_request: NextRequest, { params }: { params: Promise<Params> }) {
  const { slugs } = await params;
  const parsed = parseSlugs(slugs);
  if (!parsed) {
    return NextResponse.json({ error: "Path must be /api/memories/<type>/<slug>" }, { status: 400 });
  }
  const memory = await readMemory(parsed.type, parsed.slug);
  if (!memory) {
    return NextResponse.json({ error: "Memory not found" }, { status: 404 });
  }
  return NextResponse.json({ memory });
}

export async function PUT(request: NextRequest, { params }: { params: Promise<Params> }) {
  const { slugs } = await params;
  const parsed = parseSlugs(slugs);
  if (!parsed) {
    return NextResponse.json({ error: "Path must be /api/memories/<type>/<slug>" }, { status: 400 });
  }

  try {
    const body = await request.json();
    const memory = await updateMemory(parsed.type, parsed.slug, body);
    return NextResponse.json({ memory });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("not found")) {
      return NextResponse.json({ error: message }, { status: 404 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<Params> }) {
  return PUT(request, { params });
}

export async function DELETE(_request: NextRequest, { params }: { params: Promise<Params> }) {
  const { slugs } = await params;
  const parsed = parseSlugs(slugs);
  if (!parsed) {
    return NextResponse.json({ error: "Path must be /api/memories/<type>/<slug>" }, { status: 400 });
  }

  const success = await deleteMemory(parsed.type, parsed.slug);
  if (!success) {
    return NextResponse.json({ error: "Memory not found" }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
