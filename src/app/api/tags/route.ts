import { NextResponse } from "next/server";
import { listTags } from "@/lib/fs/notes";

export async function GET() {
  try {
    const tags = listTags();
    return NextResponse.json({ tags });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
