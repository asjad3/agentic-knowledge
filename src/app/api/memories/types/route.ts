import { NextResponse } from "next/server";
import { getMemoryTypes } from "@/lib/memory/memory";

export async function GET() {
  try {
    const types = await getMemoryTypes();
    return NextResponse.json({ types });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
