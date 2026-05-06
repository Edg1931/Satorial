import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const r = db().prepare(`
    INSERT INTO group_orders (name, event_type, event_date, organizer_name, organizer_email, organizer_phone, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(body.name, body.event_type || null, body.event_date || null, body.organizer_name || null, body.organizer_email || null, body.organizer_phone || null, body.notes || null);
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
