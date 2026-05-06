import { NextRequest, NextResponse } from "next/server";
import { db, generateBarcode } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const required = ["sku", "name", "category"];
  for (const f of required) if (!body[f]) return NextResponse.json({ error: `Missing ${f}` }, { status: 400 });
  const conn = db();
  const exists = conn.prepare("SELECT id FROM items WHERE sku = ?").get(body.sku);
  if (exists) return NextResponse.json({ error: "SKU already exists" }, { status: 409 });
  const barcode = body.barcode || generateBarcode(body.sku);
  const r = conn.prepare(`
    INSERT INTO items (style_id, sku, barcode, name, category, brand, color, size, material, cost_cents, price_cents, quantity, reorder_point, supplier, location, is_rental, notes)
    VALUES (@style_id, @sku, @barcode, @name, @category, @brand, @color, @size, @material, @cost_cents, @price_cents, @quantity, @reorder_point, @supplier, @location, @is_rental, @notes)
  `).run({
    style_id: body.style_id || null,
    sku: body.sku,
    barcode,
    name: body.name,
    category: body.category,
    brand: body.brand || null,
    color: body.color || null,
    size: body.size || null,
    material: body.material || null,
    cost_cents: body.cost_cents || 0,
    price_cents: body.price_cents || 0,
    quantity: body.quantity ?? 0,
    reorder_point: body.reorder_point ?? 0,
    supplier: body.supplier || null,
    location: body.location || null,
    is_rental: body.is_rental ? 1 : 0,
    notes: body.notes || null,
  });
  return NextResponse.json({ id: Number(r.lastInsertRowid), barcode });
}
