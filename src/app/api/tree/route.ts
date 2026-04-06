import { NextResponse } from "next/server";
import { getTree } from "@/lib/fs/tree";

export async function GET() {
  try {
    const tree = getTree();
    return NextResponse.json({ tree });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
