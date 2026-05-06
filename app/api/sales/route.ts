import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getConfig, cloverPushSale } from "@/lib/integrations/clover";
import { enrollInDripFlows } from "@/lib/drip";
import type { Item } from "@/lib/types";

function backInStockMaybe(_conn: any, _customerId: number) { /* placeholder */ }

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
    const credit = Math.min(body.credit_applied_cents || 0, Math.max(0, total - (body.discount_cents || 0)));
    total = total - (body.discount_cents || 0) - credit + (body.tax_cents || 0);
    const r = conn.prepare(`
      INSERT INTO sales (customer_id, customer_name, payment_method, total_cents, tax_cents, discount_cents, credit_applied_cents, staff_id, referral_code, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(body.customer_id || null, body.customer_name || null, body.payment_method || null, total, body.tax_cents || 0, body.discount_cents || 0, credit, body.staff_id || null, body.referral_code || null, body.notes || null);
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

    if (body.staff_id) {
      const staff = conn.prepare("SELECT commission_percent FROM staff WHERE id = ?").get(body.staff_id) as { commission_percent: number } | undefined;
      const pct = Number(staff?.commission_percent || 0);
      if (pct > 0) {
        const amount = Math.round(total * (pct / 100));
        conn.prepare("INSERT INTO commissions (sale_id, staff_id, percent, amount_cents) VALUES (?, ?, ?, ?)").run(saleId, body.staff_id, pct, amount);
      }
    }

    if (body.credit_applied_cents && body.customer_id) {
      conn.prepare("UPDATE customers SET loyalty_credits_cents = MAX(0, loyalty_credits_cents - ?) WHERE id = ?").run(credit, body.customer_id);
    }

    if (body.referral_code && body.customer_id) {
      const ref = conn.prepare("SELECT * FROM referrals WHERE code = ? AND status = 'pending'").get(body.referral_code) as any;
      if (ref && ref.referrer_customer_id !== body.customer_id) {
        conn.prepare("UPDATE referrals SET referee_customer_id = ?, referee_sale_id = ?, status = 'redeemed', redeemed_at = datetime('now') WHERE id = ?").run(body.customer_id, saleId, ref.id);
        conn.prepare("UPDATE customers SET loyalty_credits_cents = loyalty_credits_cents + ? WHERE id = ?").run(ref.reward_credit_cents, ref.referrer_customer_id);
      }
    }

    if (body.customer_id) backInStockMaybe(conn, body.customer_id);
  });
  tx();

  const cfg = getConfig("clover");
  if (cfg) cloverPushSale(cfg as any, { total_cents: total, tax_cents: body.tax_cents || 0, lines: cloverLines }).catch(() => {});

  if (body.customer_id) enrollInDripFlows(body.customer_id, "post_purchase");

  return NextResponse.json({ id: saleId, total_cents: total });
}
