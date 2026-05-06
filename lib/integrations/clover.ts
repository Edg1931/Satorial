import { db } from "../db";
import type { Integration } from "../types";

export type CloverConfig = {
  merchantId: string;
  apiToken: string;
  baseUrl?: string;
};

export function getConfig(provider: "clover" | "twilio" | "resend"): any | null {
  const row = db().prepare("SELECT * FROM integrations WHERE provider = ?").get(provider) as Integration | undefined;
  if (!row?.config) return null;
  try { return JSON.parse(row.config); } catch { return null; }
}

export function setConfig(provider: "clover" | "twilio" | "resend", config: any, status: "connected" | "disconnected" | "error" = "connected") {
  db().prepare(`
    INSERT INTO integrations (provider, status, config) VALUES (?, ?, ?)
    ON CONFLICT(provider) DO UPDATE SET status = excluded.status, config = excluded.config
  `).run(provider, status, JSON.stringify(config));
}

function cloverBase(c: CloverConfig) {
  return c.baseUrl?.replace(/\/$/, "") || "https://api.clover.com";
}

export async function cloverPing(c: CloverConfig): Promise<{ ok: boolean; merchantName?: string; error?: string }> {
  try {
    const r = await fetch(`${cloverBase(c)}/v3/merchants/${c.merchantId}`, {
      headers: { Authorization: `Bearer ${c.apiToken}` },
    });
    const j = await r.json();
    if (!r.ok) return { ok: false, error: j.message || `HTTP ${r.status}` };
    return { ok: true, merchantName: j.name };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function cloverPullInventory(c: CloverConfig): Promise<{ created: number; updated: number; errors: string[] }> {
  const res = { created: 0, updated: 0, errors: [] as string[] };
  let offset = 0;
  const limit = 100;
  const conn = db();
  const upsert = conn.prepare(`
    INSERT INTO items (sku, barcode, name, category, color, size, cost_cents, price_cents, quantity, reorder_point, supplier, location, is_rental)
    VALUES (@sku, @barcode, @name, @category, @color, @size, @cost_cents, @price_cents, @quantity, @reorder_point, @supplier, @location, 0)
    ON CONFLICT(sku) DO UPDATE SET
      name = excluded.name,
      price_cents = excluded.price_cents,
      cost_cents = COALESCE(excluded.cost_cents, items.cost_cents),
      quantity = excluded.quantity,
      updated_at = datetime('now')
  `);
  while (true) {
    try {
      const r = await fetch(`${cloverBase(c)}/v3/merchants/${c.merchantId}/items?limit=${limit}&offset=${offset}&expand=itemStock,categories`, {
        headers: { Authorization: `Bearer ${c.apiToken}` },
      });
      const j = await r.json();
      if (!r.ok) { res.errors.push(j.message || `HTTP ${r.status}`); break; }
      const elements = j.elements || [];
      for (const it of elements) {
        const sku = it.sku || it.code || it.id;
        const exists = conn.prepare("SELECT id FROM items WHERE sku = ?").get(sku);
        const category = (it.categories?.elements?.[0]?.name) || "Uncategorized";
        upsert.run({
          sku,
          barcode: it.code || sku,
          name: it.name,
          category,
          color: null,
          size: null,
          cost_cents: Math.round((it.cost || 0) * 1) || 0,
          price_cents: Math.round((it.price || 0) * 1) || 0,
          quantity: Math.round(it.itemStock?.quantity || 0),
          reorder_point: 0,
          supplier: null,
          location: null,
        });
        if (exists) res.updated++; else res.created++;
      }
      if (elements.length < limit) break;
      offset += limit;
    } catch (e: any) { res.errors.push(e?.message || String(e)); break; }
  }
  conn.prepare("UPDATE integrations SET last_sync_at = datetime('now'), last_sync_summary = ? WHERE provider = 'clover'")
    .run(`Pulled: ${res.created} new, ${res.updated} updated, ${res.errors.length} errors`);
  return res;
}

export async function cloverPushSale(c: CloverConfig, sale: { total_cents: number; tax_cents: number; lines: Array<{ name: string; sku?: string | null; quantity: number; unit_price_cents: number }> }): Promise<{ ok: boolean; orderId?: string; error?: string }> {
  try {
    const create = await fetch(`${cloverBase(c)}/v3/merchants/${c.merchantId}/orders`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ state: "open", title: "Satorial OS sale" }),
    });
    const cj = await create.json();
    if (!create.ok || !cj.id) return { ok: false, error: cj.message || "create order failed" };
    for (const line of sale.lines) {
      await fetch(`${cloverBase(c)}/v3/merchants/${c.merchantId}/orders/${cj.id}/line_items`, {
        method: "POST",
        headers: { Authorization: `Bearer ${c.apiToken}`, "Content-Type": "application/json" },
        body: JSON.stringify({ name: line.name, price: line.unit_price_cents, unitQty: line.quantity }),
      });
    }
    return { ok: true, orderId: cj.id };
  } catch (e: any) { return { ok: false, error: e?.message || String(e) }; }
}

export async function cloverAdjustStock(c: CloverConfig, sku: string, delta: number): Promise<{ ok: boolean; error?: string }> {
  try {
    const find = await fetch(`${cloverBase(c)}/v3/merchants/${c.merchantId}/items?filter=sku=${encodeURIComponent(sku)}`, {
      headers: { Authorization: `Bearer ${c.apiToken}` },
    });
    const fj = await find.json();
    const item = fj.elements?.[0];
    if (!item) return { ok: false, error: "SKU not found in Clover" };
    const stockGet = await fetch(`${cloverBase(c)}/v3/merchants/${c.merchantId}/item_stocks/${item.id}`, {
      headers: { Authorization: `Bearer ${c.apiToken}` },
    });
    const sj = await stockGet.json();
    const nextQty = Math.max(0, (sj.quantity || 0) + delta);
    const upd = await fetch(`${cloverBase(c)}/v3/merchants/${c.merchantId}/item_stocks/${item.id}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${c.apiToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({ quantity: nextQty }),
    });
    if (!upd.ok) { const j = await upd.json().catch(() => ({})); return { ok: false, error: j.message || `HTTP ${upd.status}` }; }
    return { ok: true };
  } catch (e: any) { return { ok: false, error: e?.message || String(e) }; }
}
