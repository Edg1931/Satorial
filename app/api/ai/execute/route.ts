import { NextRequest, NextResponse } from "next/server";
import { executeTool } from "@/lib/ai-tools";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const { tool, params } = body;
  if (!tool) return NextResponse.json({ error: "tool required" }, { status: 400 });
  const r = await executeTool(tool, params || {});
  db().prepare(`INSERT INTO ai_actions (tool, params, status, result) VALUES (?, ?, ?, ?)`)
    .run(tool, JSON.stringify(params || {}), r.ok ? "executed" : "failed", JSON.stringify(r.result || r.error || {}));
  return NextResponse.json(r, { status: r.ok ? 200 : 400 });
}
