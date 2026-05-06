import Anthropic from "@anthropic-ai/sdk";
import { db } from "./db";
import type { Item, Sale, SaleItem, Appointment } from "./types";
import { TOOLS, type ProposedAction } from "./ai-tools";

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export function aiEnabled(): boolean {
  return !!process.env.ANTHROPIC_API_KEY;
}

let _client: Anthropic | null = null;
function client(): Anthropic {
  if (!_client) _client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  return _client;
}

export type AISnapshot = {
  inventory: { totalSkus: number; totalUnits: number; lowStock: Array<{ name: string; size: string | null; color: string | null; quantity: number; reorder_point: number }> };
  sales: { last30Revenue: number; last30Units: number; topSizes: Array<{ category: string; size: string; units: number }>; topItems: Array<{ name: string; units: number; revenue: number }> };
  appointments: { upcoming: Array<{ id: number; type: string; customer_name: string; appointment_date: string; event_date: string | null; stage: string }>; atRisk: Array<{ id: number; customer_name: string; reason: string }> };
  finance: { last30Revenue: number; estimatedCogs: number; estimatedMargin: number };
};

export function snapshot(): AISnapshot {
  const conn = db();
  const lowStock = conn.prepare(`
    SELECT name, size, color, quantity, reorder_point
    FROM items
    WHERE quantity <= reorder_point
    ORDER BY (reorder_point - quantity) DESC
    LIMIT 25
  `).all() as AISnapshot["inventory"]["lowStock"];

  const totals = conn.prepare(`SELECT COUNT(*) as skus, COALESCE(SUM(quantity), 0) as units FROM items`).get() as { skus: number; units: number };

  const last30 = conn.prepare(`
    SELECT COALESCE(SUM(s.total_cents), 0) AS rev,
           COALESCE(SUM(si.quantity), 0) AS units
    FROM sales s LEFT JOIN sale_items si ON si.sale_id = s.id
    WHERE s.sold_at >= datetime('now', '-30 days')
  `).get() as { rev: number; units: number };

  const topSizes = conn.prepare(`
    SELECT category_at_sale AS category, COALESCE(size_at_sale, '—') AS size, SUM(quantity) AS units
    FROM sale_items si JOIN sales s ON s.id = si.sale_id
    WHERE s.sold_at >= datetime('now', '-90 days')
    GROUP BY category_at_sale, size_at_sale
    ORDER BY units DESC
    LIMIT 10
  `).all() as Array<{ category: string; size: string; units: number }>;

  const topItems = conn.prepare(`
    SELECT name_at_sale AS name, SUM(quantity) AS units, SUM(quantity * unit_price_cents) AS revenue
    FROM sale_items si JOIN sales s ON s.id = si.sale_id
    WHERE s.sold_at >= datetime('now', '-90 days')
    GROUP BY name_at_sale
    ORDER BY units DESC
    LIMIT 8
  `).all() as Array<{ name: string; units: number; revenue: number }>;

  const upcoming = conn.prepare(`
    SELECT id, type, customer_name, appointment_date, event_date, stage
    FROM appointments
    WHERE status = 'open' AND appointment_date >= datetime('now', '-1 days')
    ORDER BY appointment_date ASC
    LIMIT 10
  `).all() as AISnapshot["appointments"]["upcoming"];

  const atRisk = conn.prepare(`
    SELECT id, customer_name,
           CASE
             WHEN event_date IS NOT NULL AND date(event_date) <= date('now', '+7 days') AND stage NOT IN ('ready','delivered','cancelled') THEN 'Event in <=7d, garment not ready'
             WHEN garment_expected_date IS NOT NULL AND date(garment_expected_date) < date('now') AND stage NOT IN ('ready','delivered','cancelled') THEN 'Past expected date'
             ELSE NULL
           END AS reason
    FROM appointments
    WHERE status = 'open'
  `).all() as Array<{ id: number; customer_name: string; reason: string | null }>;

  const cogs = conn.prepare(`
    SELECT COALESCE(SUM(si.quantity * i.cost_cents), 0) AS cogs
    FROM sale_items si JOIN sales s ON s.id = si.sale_id JOIN items i ON i.id = si.item_id
    WHERE s.sold_at >= datetime('now', '-30 days')
  `).get() as { cogs: number };

  return {
    inventory: { totalSkus: totals.skus, totalUnits: totals.units, lowStock },
    sales: {
      last30Revenue: last30.rev,
      last30Units: last30.units,
      topSizes,
      topItems: topItems.map((t) => ({ name: t.name, units: t.units, revenue: t.revenue })),
    },
    appointments: {
      upcoming,
      atRisk: atRisk.filter((r) => r.reason).map((r) => ({ id: r.id, customer_name: r.customer_name, reason: r.reason as string })),
    },
    finance: {
      last30Revenue: last30.rev,
      estimatedCogs: cogs.cogs,
      estimatedMargin: last30.rev > 0 ? (last30.rev - cogs.cogs) / last30.rev : 0,
    },
  };
}

const SYSTEM = `You are the AI operations partner for Satorial, a high-end men's retail and custom-tailoring boutique.
You are pragmatic, decisive, and write like a senior retail GM: concise bullets, real numbers, action-first.
You help across:
  • Inventory — reorder calls, slow-movers, size mix, allocation between rentals and retail.
  • Sales — what's selling, by size & category, attach-rate ideas.
  • Custom-suit & rental operations — at-risk orders, fitting timelines, group/wedding parties.
  • Finance — revenue trend, gross margin, deposit balances, suggested promotions.
  • Marketing — email subject lines, IG/TikTok captions, weekly content calendar, promotion copy.
  • Social — draft platform-specific posts (IG, FB, X, TikTok, LinkedIn) with appropriate tone.
You always ground answers in the BUSINESS_SNAPSHOT JSON provided. If something isn't in the snapshot, say so.
When drafting marketing or social copy, produce ready-to-publish text — do not include placeholders unless data is missing.
Format: short bullets, bold key metrics, no filler preamble.`;

export async function aiChat(opts: {
  conversationId: string;
  userMessage: string;
  history?: Array<{ role: "user" | "assistant"; content: string }>;
  contextHint?: string;
}): Promise<{ text: string; actions: ProposedAction[] }> {
  if (!aiEnabled()) {
    return { text: offlineFallback(opts.userMessage), actions: [] };
  }

  const snap = snapshot();
  const messages = [
    ...(opts.history || []).map((m) => ({ role: m.role, content: m.content })),
    {
      role: "user" as const,
      content: `BUSINESS_SNAPSHOT (live):\n\`\`\`json\n${JSON.stringify(snap, null, 2)}\n\`\`\`\n\n${opts.contextHint ? `Context: ${opts.contextHint}\n\n` : ""}Question: ${opts.userMessage}\n\nWhen you want to make a change to the system, propose a tool call. The owner will manually approve before anything is committed.`,
    },
  ];

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 2000,
    system: SYSTEM,
    tools: TOOLS as any,
    messages,
  });
  const textParts: string[] = [];
  const actions: ProposedAction[] = [];
  for (const block of resp.content) {
    if (block.type === "text") textParts.push((block as any).text);
    else if (block.type === "tool_use") {
      const tu = block as any;
      actions.push({
        id: tu.id,
        tool: tu.name,
        description: describeAction(tu.name, tu.input),
        params: tu.input,
      });
    }
  }
  return { text: textParts.join("\n").trim() || "(proposed actions below)", actions };
}

function describeAction(tool: string, input: any): string {
  switch (tool) {
    case "adjust_inventory":
      return `Adjust stock for ${input.sku || `item #${input.item_id}`} by ${input.delta > 0 ? "+" : ""}${input.delta}${input.reason ? ` — ${input.reason}` : ""}`;
    case "create_purchase_order_recommendation":
      return `Draft purchase order to ${input.supplier} (${(input.lines || []).length} lines)`;
    case "draft_social_post":
      return `Draft social post for ${(input.platforms || []).join(", ")}${input.scheduled_for ? ` scheduled ${input.scheduled_for}` : ""}`;
    case "draft_campaign":
      return `Draft ${input.channel} campaign: "${input.name}"`;
    case "set_appointment_stage":
      return `Move appointment #${input.appointment_id} to "${input.stage}"`;
    default: return tool;
  }
}

export async function generateSocialPost(opts: {
  prompt: string;
  platforms: string[];
  tone?: string;
}): Promise<{ caption: string; hashtags: string[]; perPlatform: Record<string, string> }> {
  if (!aiEnabled()) {
    const c = `${opts.prompt} — crafted in our atelier. Visit us this week.`;
    return {
      caption: c,
      hashtags: ["#menswear", "#bespoke", "#tailoring", "#satorial"],
      perPlatform: Object.fromEntries(opts.platforms.map((p) => [p, c])),
    };
  }

  const snap = snapshot();
  const sys = `You write social media copy for Satorial, a refined men's retail/tailoring brand.
Voice: confident, sartorial, understated. No exclamation points unless tasteful. No emoji-spam (max 1).
Return STRICT JSON: { "caption": string, "hashtags": string[], "perPlatform": { [platform]: string } }
Per-platform tailoring rules:
  - instagram: 1-3 short paragraphs, single CTA, 5-10 hashtags inline at end.
  - facebook: 2-4 sentences, link-friendly CTA.
  - x: <=270 characters, no hashtag spam (max 2).
  - tiktok: hook first line, casual, end with hashtag list.
  - linkedin: professional, 3-5 sentences, no hashtags or 1-2 max.
Use real numbers from BUSINESS_SNAPSHOT only if relevant; do not invent stats.`;
  const user = `Brief: ${opts.prompt}\nTone: ${opts.tone || "default brand voice"}\nPlatforms: ${opts.platforms.join(", ")}\n\nBUSINESS_SNAPSHOT:\n\`\`\`json\n${JSON.stringify(snap)}\n\`\`\``;

  const resp = await client().messages.create({
    model: MODEL,
    max_tokens: 1200,
    system: sys,
    messages: [{ role: "user", content: user }],
  });
  const text = resp.content
    .filter((b) => b.type === "text")
    .map((b: any) => b.text)
    .join("")
    .trim();
  const json = extractJson(text);
  return {
    caption: json.caption || "",
    hashtags: Array.isArray(json.hashtags) ? json.hashtags : [],
    perPlatform: typeof json.perPlatform === "object" && json.perPlatform ? json.perPlatform : {},
  };
}

function extractJson(text: string): any {
  const fence = text.match(/```json\s*([\s\S]*?)```/i) || text.match(/```([\s\S]*?)```/);
  const body = fence ? fence[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1) return {};
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return {};
  }
}

function offlineFallback(_q: string): string {
  const s = snapshot();
  const lines = [
    "**AI offline** — set `ANTHROPIC_API_KEY` to enable live answers. Live snapshot:",
    `• Inventory: **${s.inventory.totalUnits} units** across **${s.inventory.totalSkus} SKUs** — ${s.inventory.lowStock.length} below reorder point.`,
    `• Last 30 days: **$${(s.sales.last30Revenue / 100).toFixed(0)}** rev, ${s.sales.last30Units} units, est. margin **${(s.finance.estimatedMargin * 100).toFixed(1)}%**.`,
    `• Upcoming appointments: ${s.appointments.upcoming.length}; at-risk: **${s.appointments.atRisk.length}**.`,
    s.appointments.atRisk.length ? `• At-risk: ${s.appointments.atRisk.slice(0, 3).map((a) => `${a.customer_name} (${a.reason})`).join("; ")}.` : "",
  ].filter(Boolean);
  return lines.join("\n");
}
