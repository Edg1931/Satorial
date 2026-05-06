import { NextRequest, NextResponse } from "next/server";
import { exec } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.supplier) return NextResponse.json({ error: "supplier required" }, { status: 400 });
  const r = await exec(`INSERT INTO purchase_orders (supplier, expected_at, total_cents, notes) VALUES (?, ?, ?, ?)`,
    [body.supplier, body.expected_at || null, body.total_cents || 0, body.notes || null]);
  for (const l of (body.lines || [])) {
    await exec(`INSERT INTO purchase_order_items (po_id, item_id, sku, name, quantity, unit_cost_cents) VALUES (?, ?, ?, ?, ?, ?)`,
      [r.insertId, l.item_id || null, l.sku || null, l.name, l.quantity || 1, l.unit_cost_cents || 0]);
  }
  return NextResponse.json({ id: r.insertId });
}
