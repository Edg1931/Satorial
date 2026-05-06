import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getConfig, cloverPushSale } from "@/lib/integrations/clover";
import type { Item } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lines: Array<{ item_id: number; quantity: number; unit_price_cents: number }> = body.lines || [];
  if (lines.length === 0) return NextResponse.json({ error: "No lines" }, { status: 400 });
  const conn = db();

  let saleId = 0;
  let total = 0;
  const cloverLines: Array<{ name: string; sku?: string | null; quantity: number; unit_price_cents: number }> = [];
  const tx = conn.transaction(() => {
    for (const l of lines) total += l.quantity * l.unit_price_cents;
    total = total - (body.discount_cents || 0) + (body.tax_cents || 0);
    const r = conn.prepare(`
      INSERT INTO sales (customer_id, customer_name, payment_method, total_cents, tax_cents, discount_cents, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(body.customer_id || null, body.customer_name || null, body.payment_method || null, total, body.tax_cents || 0, body.discount_cents || 0, body.notes || null);
    saleId = Number(r.lastInsertRowid);

    const insLine = conn.prepare(`INSERT INTO sale_items (sale_id, item_id, quantity, unit_price_cents, size_at_sale, category_at_sale, name_at_sale) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    const decStock = conn.prepare("UPDATE items SET quantity = MAX(0, quantity - ?) WHERE id = ?");
    for (const l of lines) {
      const item = conn.prepare("SELECT * FROM items WHERE id = ?").get(l.item_id) as Item | undefined;
      if (!item) continue;
      insLine.run(saleId, l.item_id, l.quantity, l.unit_price_cents, item.size, item.category, item.name);
      decStock.run(l.quantity, l.item_id);
      cloverLines.push({ name: item.name, sku: item.sku, quantity: l.quantity, unit_price_cents: l.unit_price_cents });
    }
  });
  tx();

  const cfg = getConfig("clover");
  if (cfg) cloverPushSale(cfg as any, { total_cents: total, tax_cents: body.tax_cents || 0, lines: cloverLines }).catch(() => {});

  return NextResponse.json({ id: saleId, total_cents: total });
}
