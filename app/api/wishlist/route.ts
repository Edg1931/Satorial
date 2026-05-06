import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.customer_id) return NextResponse.json({ error: "customer_id required" }, { status: 400 });
  const r = db().prepare(`INSERT INTO wishlist (customer_id, item_id, style_id, label, notify_email, notify_sms) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(body.customer_id, body.item_id || null, body.style_id || null, body.label || null, body.notify_email ?? 1, body.notify_sms ?? 0);
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
