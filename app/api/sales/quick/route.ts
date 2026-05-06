import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getConfig, cloverPushSale, cloverAdjustStock } from "@/lib/integrations/clover";
import type { Item } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const { item_id, quantity = 1 } = await req.json();
  const conn = db();
  const item = conn.prepare("SELECT * FROM items WHERE id = ?").get(item_id) as Item | undefined;
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const total = item.price_cents * quantity;
  const r = conn.prepare(`INSERT INTO sales (customer_name, payment_method, total_cents) VALUES ('Walk-in (scan)', 'Card', ?)`).run(total);
  const saleId = Number(r.lastInsertRowid);
  conn.prepare(`INSERT INTO sale_items (sale_id, item_id, quantity, unit_price_cents, size_at_sale, category_at_sale, name_at_sale) VALUES (?, ?, ?, ?, ?, ?, ?)`).run(saleId, item.id, quantity, item.price_cents, item.size, item.category, item.name);
  conn.prepare("UPDATE items SET quantity = MAX(0, quantity - ?) WHERE id = ?").run(quantity, item.id);

  const cfg = getConfig("clover");
  if (cfg) {
    cloverAdjustStock(cfg as any, item.sku, -quantity).catch(() => {});
    cloverPushSale(cfg as any, { total_cents: total, tax_cents: 0, lines: [{ name: item.name, sku: item.sku, quantity, unit_price_cents: item.price_cents }] }).catch(() => {});
  }
  return NextResponse.json({ ok: true, sale_id: saleId });
}
