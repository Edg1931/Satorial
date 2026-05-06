import { NextRequest, NextResponse } from "next/server";
import { exec, one } from "@/lib/db";
import { getConfig, cloverPushSale } from "@/lib/integrations/clover";
import { enrollInDripFlows } from "@/lib/drip";
import type { Item } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const lines: Array<{ item_id: number; quantity: number; unit_price_cents: number }> = body.lines || [];
  if (lines.length === 0) return NextResponse.json({ error: "No lines" }, { status: 400 });

  let total = 0;
  for (const l of lines) total += l.quantity * l.unit_price_cents;
  const credit = Math.min(body.credit_applied_cents || 0, Math.max(0, total - (body.discount_cents || 0)));
  total = total - (body.discount_cents || 0) - credit + (body.tax_cents || 0);

  const r = await exec(`
    INSERT INTO sales (customer_id, customer_name, payment_method, total_cents, tax_cents, discount_cents, credit_applied_cents, staff_id, referral_code, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [body.customer_id || null, body.customer_name || null, body.payment_method || null, total, body.tax_cents || 0, body.discount_cents || 0, credit, body.staff_id || null, body.referral_code || null, body.notes || null]);
  const saleId = r.insertId;

  const cloverLines: Array<{ name: string; sku?: string | null; quantity: number; unit_price_cents: number }> = [];
  for (const l of lines) {
    const item = await one<Item>("SELECT * FROM items WHERE id = ?", [l.item_id]);
    if (!item) continue;
    await exec(`INSERT INTO sale_items (sale_id, item_id, quantity, unit_price_cents, size_at_sale, category_at_sale, name_at_sale) VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [saleId, l.item_id, l.quantity, l.unit_price_cents, item.size, item.category, item.name]);
    await exec("UPDATE items SET quantity = MAX(0, quantity - ?) WHERE id = ?", [l.quantity, l.item_id]);
    cloverLines.push({ name: item.name, sku: item.sku, quantity: l.quantity, unit_price_cents: l.unit_price_cents });
  }

  if (body.staff_id) {
    const staff = await one<{ commission_percent: number }>("SELECT commission_percent FROM staff WHERE id = ?", [body.staff_id]);
    const pct = Number(staff?.commission_percent || 0);
    if (pct > 0) {
      const amount = Math.round(total * (pct / 100));
      await exec("INSERT INTO commissions (sale_id, staff_id, percent, amount_cents) VALUES (?, ?, ?, ?)", [saleId, body.staff_id, pct, amount]);
    }
  }

  if (credit && body.customer_id) {
    await exec("UPDATE customers SET loyalty_credits_cents = MAX(0, loyalty_credits_cents - ?) WHERE id = ?", [credit, body.customer_id]);
  }

  if (body.referral_code && body.customer_id) {
    const ref = await one<any>("SELECT * FROM referrals WHERE code = ? AND status = 'pending'", [body.referral_code]);
    if (ref && ref.referrer_customer_id !== body.customer_id) {
      await exec("UPDATE referrals SET referee_customer_id = ?, referee_sale_id = ?, status = 'redeemed', redeemed_at = datetime('now') WHERE id = ?", [body.customer_id, saleId, ref.id]);
      await exec("UPDATE customers SET loyalty_credits_cents = loyalty_credits_cents + ? WHERE id = ?", [ref.reward_credit_cents, ref.referrer_customer_id]);
    }
  }

  const cfg = await getConfig("clover");
  if (cfg) cloverPushSale(cfg as any, { total_cents: total, tax_cents: body.tax_cents || 0, lines: cloverLines }).catch(() => {});

  if (body.customer_id) enrollInDripFlows(body.customer_id, "post_purchase");

  return NextResponse.json({ id: saleId, total_cents: total });
}
