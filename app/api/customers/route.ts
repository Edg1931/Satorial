import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { enrollInDripFlows } from "@/lib/drip";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const r = db().prepare(`
    INSERT INTO customers (name, email, phone, address, birthday, preferences, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(body.name, body.email || null, body.phone || null, body.address || null, body.birthday || null, body.preferences || null, body.notes || null);
  const id = Number(r.lastInsertRowid);
  enrollInDripFlows(id, "new_customer");
  return NextResponse.json({ id });
}
