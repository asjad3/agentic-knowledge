import { NextRequest, NextResponse } from "next/server";
import { searchMemories } from "@/lib/memory/memory";
import type { MemoryType } from "@/lib/memory/types";

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get("q");
    const type = url.searchParams.get("type") as MemoryType | null;
    const limit = parseInt(url.searchParams.get("limit") ?? "20", 10);

    if (!q) {
      return NextResponse.json({ error: "q parameter is required" }, { status: 400 });
    }

    const results = await searchMemories(q, { type: type ?? undefined, limit });
    return NextResponse.json({ results, total: results.length });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
