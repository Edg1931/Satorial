import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.supplier) return NextResponse.json({ error: "supplier required" }, { status: 400 });
  const conn = db();
  const r = conn.prepare(`INSERT INTO purchase_orders (supplier, expected_at, total_cents, notes) VALUES (?, ?, ?, ?)`)
    .run(body.supplier, body.expected_at || null, body.total_cents || 0, body.notes || null);
  const poId = Number(r.lastInsertRowid);
  const ins = conn.prepare(`INSERT INTO purchase_order_items (po_id, item_id, sku, name, quantity, unit_cost_cents) VALUES (?, ?, ?, ?, ?, ?)`);
  for (const l of (body.lines || [])) ins.run(poId, l.item_id || null, l.sku || null, l.name, l.quantity || 1, l.unit_cost_cents || 0);
  return NextResponse.json({ id: poId });
}
