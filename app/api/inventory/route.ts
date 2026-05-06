import { NextRequest, NextResponse } from "next/server";
import { exec, one } from "@/lib/db";
import { generateBarcode } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  for (const f of ["sku", "name", "category"]) if (!body[f]) return NextResponse.json({ error: `Missing ${f}` }, { status: 400 });
  const exists = await one("SELECT id FROM items WHERE sku = ?", [body.sku]);
  if (exists) return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
  const barcode = body.barcode || generateBarcode(body.sku);
  const r = await exec(`
    INSERT INTO items (style_id, sku, barcode, name, category, brand, color, size, material, cost_cents, price_cents, quantity, reorder_point, supplier, location, is_rental, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [body.style_id || null, body.sku, barcode, body.name, body.category, body.brand || null, body.color || null, body.size || null, body.material || null, body.cost_cents || 0, body.price_cents || 0, body.quantity ?? 0, body.reorder_point ?? 0, body.supplier || null, body.location || null, body.is_rental ? 1 : 0, body.notes || null]);
  return NextResponse.json({ id: r.insertId, barcode });
}
