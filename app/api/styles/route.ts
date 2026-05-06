import { NextRequest, NextResponse } from "next/server";
import { exec, one, generateBarcode } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.style_code || !body.name) return NextResponse.json({ error: "style_code and name required" }, { status: 400 });
  const exists = await one("SELECT id FROM styles WHERE style_code = ?", [body.style_code]);
  if (exists) return NextResponse.json({ error: "Style code exists" }, { status: 409 });
  const r = await exec(`
    INSERT INTO styles (style_code, name, category, brand, description, base_price_cents, base_cost_cents, is_rental)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [body.style_code, body.name, body.category || "Uncategorized", body.brand || null, body.description || null, body.base_price_cents || 0, body.base_cost_cents || 0, body.is_rental || 0]);
  const styleId = r.insertId;

  const colors: string[] = body.colors || [];
  const sizes: string[] = body.sizes || [];
  let createdCount = 0;
  for (const color of colors.length ? colors : [""]) {
    for (const size of sizes.length ? sizes : [""]) {
      const sku = `${body.style_code}-${(color || "").replace(/\s+/g, "").slice(0, 3).toUpperCase() || "X"}-${(size || "").replace(/\W+/g, "") || "X"}`;
      const barcode = generateBarcode(sku);
      await exec(`
        INSERT INTO items (style_id, sku, barcode, name, category, brand, color, size, material, cost_cents, price_cents, quantity, reorder_point, supplier, location, is_rental)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [styleId, sku, barcode, body.name, body.category || "Uncategorized", body.brand || null,
          color || null, size || null, body.material || null,
          body.base_cost_cents || 0, body.base_price_cents || 0,
          body.qty_each ?? 0, body.reorder_each ?? 0,
          body.supplier || null, body.location || null, body.is_rental || 0]);
      createdCount++;
    }
  }
  return NextResponse.json({ id: styleId, items_created: createdCount });
}
