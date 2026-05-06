import { db } from "./db";
import type { Item } from "./types";
import { getConfig, cloverAdjustStock, cloverPushSale } from "./integrations/clover";

export type ProposedAction = {
  id: string;
  tool: string;
  description: string;
  params: any;
};

export const TOOLS = [
  {
    name: "adjust_inventory",
    description: "Adjust the on-hand quantity for one inventory item by a delta (positive or negative).",
    input_schema: {
      type: "object",
      properties: {
        item_id: { type: "number", description: "Item id (preferred)" },
        sku: { type: "string", description: "Or SKU" },
        delta: { type: "number" },
        reason: { type: "string" },
      },
      required: ["delta"],
    },
  },
  {
    name: "create_purchase_order_recommendation",
    description: "Draft a purchase-order recommendation (does not place it). Returns the suggested supplier, lines, and total.",
    input_schema: {
      type: "object",
      properties: {
        supplier: { type: "string" },
        lines: {
          type: "array",
          items: {
            type: "object",
            properties: { sku: { type: "string" }, name: { type: "string" }, quantity: { type: "number" }, unit_cost_cents: { type: "number" } },
            required: ["name", "quantity"],
          },
        },
      },
      required: ["supplier", "lines"],
    },
  },
  {
    name: "draft_social_post",
    description: "Save a draft social media post with caption, hashtags, and target platforms.",
    input_schema: {
      type: "object",
      properties: {
        caption: { type: "string" },
        hashtags: { type: "array", items: { type: "string" } },
        platforms: { type: "array", items: { type: "string", enum: ["instagram", "facebook", "x", "tiktok", "linkedin"] } },
        scheduled_for: { type: "string", description: "ISO datetime if scheduling" },
      },
      required: ["caption", "platforms"],
    },
  },
  {
    name: "draft_campaign",
    description: "Draft an email or SMS campaign for review.",
    input_schema: {
      type: "object",
      properties: {
        name: { type: "string" },
        channel: { type: "string", enum: ["email", "sms", "both"] },
        audience: { type: "string", enum: ["all", "with_email", "with_phone", "vip", "recent", "lapsed", "rentals_only"] },
        subject: { type: "string" },
        body: { type: "string" },
      },
      required: ["name", "channel", "body"],
    },
  },
  {
    name: "set_appointment_stage",
    description: "Move a custom suit / rental appointment to a new workflow stage.",
    input_schema: {
      type: "object",
      properties: {
        appointment_id: { type: "number" },
        stage: { type: "string", enum: ["scheduled", "measured", "cut", "first_fitting", "second_fitting", "ready", "delivered", "cancelled"] },
      },
      required: ["appointment_id", "stage"],
    },
  },
];

export async function executeTool(tool: string, params: any): Promise<{ ok: boolean; result?: any; error?: string }> {
  try {
    switch (tool) {
      case "adjust_inventory": return adjustInventory(params);
      case "create_purchase_order_recommendation": return createPO(params);
      case "draft_social_post": return draftSocial(params);
      case "draft_campaign": return draftCampaign(params);
      case "set_appointment_stage": return setStage(params);
      default: return { ok: false, error: `Unknown tool: ${tool}` };
    }
  } catch (e: any) { return { ok: false, error: e?.message || String(e) }; }
}

function adjustInventory({ item_id, sku, delta }: { item_id?: number; sku?: string; delta: number }) {
  const conn = db();
  let item: Item | undefined;
  if (item_id) item = conn.prepare("SELECT * FROM items WHERE id = ?").get(item_id) as Item | undefined;
  else if (sku) item = conn.prepare("SELECT * FROM items WHERE sku = ?").get(sku) as Item | undefined;
  if (!item) return { ok: false, error: "Item not found" };
  const next = Math.max(0, item.quantity + delta);
  conn.prepare("UPDATE items SET quantity = ?, updated_at = datetime('now') WHERE id = ?").run(next, item.id);
  const cfg = getConfig("clover");
  if (cfg) cloverAdjustStock(cfg as any, item.sku, delta).catch(() => {});
  return { ok: true, result: { item_id: item.id, sku: item.sku, previous: item.quantity, current: next } };
}

function createPO({ supplier, lines }: { supplier: string; lines: Array<{ name: string; sku?: string; quantity: number; unit_cost_cents?: number }> }) {
  const conn = db();
  const total = lines.reduce((a, b) => a + (b.unit_cost_cents || 0) * b.quantity, 0);
  const r = conn.prepare("INSERT INTO purchase_orders (supplier, total_cents, notes) VALUES (?, ?, 'Drafted by AI partner')").run(supplier, total);
  const poId = Number(r.lastInsertRowid);
  const ins = conn.prepare("INSERT INTO purchase_order_items (po_id, sku, name, quantity, unit_cost_cents) VALUES (?, ?, ?, ?, ?)");
  for (const l of lines) ins.run(poId, l.sku || null, l.name, l.quantity, l.unit_cost_cents || 0);
  return { ok: true, result: { id: poId, total_cents: total } };
}

function draftSocial({ caption, hashtags, platforms, scheduled_for }: { caption: string; hashtags?: string[]; platforms: string[]; scheduled_for?: string }) {
  const conn = db();
  const r = conn.prepare(`INSERT INTO social_posts (caption, hashtags, platforms, status, scheduled_for, created_by) VALUES (?, ?, ?, ?, ?, 'ai')`)
    .run(caption, (hashtags || []).join(" "), platforms.join(","), scheduled_for ? "scheduled" : "draft", scheduled_for || null);
  return { ok: true, result: { id: Number(r.lastInsertRowid) } };
}

function draftCampaign({ name, channel, audience, subject, body }: { name: string; channel: string; audience?: string; subject?: string; body: string }) {
  const conn = db();
  const r = conn.prepare(`INSERT INTO campaigns (name, channel, audience, subject, body, status) VALUES (?, ?, ?, ?, ?, 'draft')`)
    .run(name, channel, audience || "with_email", subject || null, body);
  return { ok: true, result: { id: Number(r.lastInsertRowid) } };
}

function setStage({ appointment_id, stage }: { appointment_id: number; stage: string }) {
  const conn = db();
  conn.prepare("UPDATE appointments SET stage = ?, updated_at = datetime('now') WHERE id = ?").run(stage, appointment_id);
  return { ok: true, result: { appointment_id, stage } };
}
