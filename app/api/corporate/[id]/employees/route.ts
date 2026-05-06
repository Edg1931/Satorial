import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const r = db().prepare(`INSERT INTO corporate_employees (account_id, name, email, phone, role, stipend_balance_cents) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(Number(params.id), body.name, body.email || null, body.phone || null, body.role || null, body.stipend_balance_cents || 0);
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
