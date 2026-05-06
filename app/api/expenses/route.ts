import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const r = db().prepare(`INSERT INTO expenses (occurred_at, category, amount_cents, vendor, notes) VALUES (?, ?, ?, ?, ?)`)
    .run(body.occurred_at || new Date().toISOString().slice(0, 10), body.category || "Other", body.amount_cents || 0, body.vendor || null, body.notes || null);
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
