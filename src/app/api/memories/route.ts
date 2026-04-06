import { NextRequest, NextResponse } from "next/server";
import { createMemory, listMemories, getMemoryTypes } from "@/lib/memory/memory";
import type { ListMemoryFilters } from "@/lib/memory/types";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const type = url.searchParams.get("type") as ListMemoryFilters["type"] | null;
    const tag = url.searchParams.get("tag") ?? undefined;
    const project = url.searchParams.get("project") ?? undefined;
    const agent = url.searchParams.get("agent") ?? undefined;
    const limit = parseInt(url.searchParams.get("limit") ?? "50", 10);
    const offset = parseInt(url.searchParams.get("offset") ?? "0", 10);

    const filters: ListMemoryFilters = { limit, offset, tag, project, agent };
    if (type) filters.type = type;

    const memories = await listMemories(filters);
    return NextResponse.json({ memories, total: memories.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { type, title, content, tags, agent, session, project, metadata } = body;

    if (!type || !content) {
      return NextResponse.json({ error: "type and content are required" }, { status: 400 });
    }

    const memory = await createMemory({
      type,
      title,
      content: content.trim(),
      tags,
      agent,
      session,
      project,
      metadata,
    });

    return NextResponse.json({ memory }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    if (message.includes("Invalid")) {
      return NextResponse.json({ error: message }, { status: 400 });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
