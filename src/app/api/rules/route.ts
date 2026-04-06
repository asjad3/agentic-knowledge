import { NextRequest, NextResponse } from "next/server";
import { getAllRules, createRule, updateRule, deleteRuleFn } from "@/lib/rules/db";

export async function GET() {
  try {
    const rules = await getAllRules();
    return NextResponse.json({ rules });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, condition, action, enabled, priority } = body;

    if (!name || !condition || !action) {
      return NextResponse.json({ error: "name, condition, and action are required" }, { status: 400 });
    }

    const rule = await createRule({ name, description: description ?? "", condition, action, enabled: enabled ?? true, priority: priority ?? 0 });
    return NextResponse.json({ rule }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...data } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const rule = await updateRule(id, data);
    if (!rule) {
      return NextResponse.json({ error: "Rule not found" }, { status: 404 });
    }
    return NextResponse.json({ rule });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const body = await request.json();
    const { id } = body;

    if (!id) {
      return NextResponse.json({ error: "id is required" }, { status: 400 });
    }

    const success = await deleteRuleFn(id);
    return NextResponse.json({ success });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
