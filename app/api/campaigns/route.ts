import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { sendEmail, sendSms, renderTemplate } from "@/lib/integrations/messaging";
import type { Customer } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || !body.body) return NextResponse.json({ error: "name and body required" }, { status: 400 });
  const conn = db();
  const r = conn.prepare(`
    INSERT INTO campaigns (name, channel, audience, audience_filter, subject, body, trigger_type, trigger_config, status, scheduled_for)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.name,
    body.channel || "email",
    body.audience || "with_email",
    body.audience_filter ? JSON.stringify(body.audience_filter) : null,
    body.subject || null,
    body.body,
    body.trigger_type || "manual",
    null,
    body.send_now ? "sending" : (body.trigger_type === "scheduled" ? "scheduled" : "draft"),
    body.scheduled_for || null,
  );
  const id = Number(r.lastInsertRowid);

  if (!body.send_now) return NextResponse.json({ id, recipients: 0 });

  const recipients = resolveAudience(body.audience, body.audience_filter || null);
  let okCount = 0;
  for (const c of recipients) {
    const ctx = {
      name: c.name,
      first_name: c.name.split(" ")[0] || c.name,
      shop_name: "Satorial",
    };
    const subject = body.subject ? renderTemplate(body.subject, ctx) : "";
    const text = renderTemplate(body.body, ctx);
    if ((body.channel === "email" || body.channel === "both") && c.email) {
      const html = `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.55">${text.replace(/\n/g, "<br/>")}</div>`;
      const res = await sendEmail({ to: c.email, subject, html });
      conn.prepare(`INSERT INTO campaign_sends (campaign_id, customer_id, channel, address, status, provider_id, error) VALUES (?, ?, 'email', ?, ?, ?, ?)`)
        .run(id, c.id, c.email, res.ok ? "ok" : "failed", res.id || null, res.error || null);
      if (res.ok) okCount++;
    }
    if ((body.channel === "sms" || body.channel === "both") && c.phone) {
      const res = await sendSms({ to: c.phone, body: text });
      conn.prepare(`INSERT INTO campaign_sends (campaign_id, customer_id, channel, address, status, provider_id, error) VALUES (?, ?, 'sms', ?, ?, ?, ?)`)
        .run(id, c.id, c.phone, res.ok ? "ok" : "failed", res.id || null, res.error || null);
      if (res.ok) okCount++;
    }
  }
  conn.prepare("UPDATE campaigns SET status = 'sent', sent_at = datetime('now'), stats = ? WHERE id = ?")
    .run(JSON.stringify({ recipients: recipients.length, sends: okCount }), id);

  return NextResponse.json({ id, recipients: recipients.length, sends: okCount });
}

function resolveAudience(audience: string, filter: any): Customer[] {
  const conn = db();
  switch (audience) {
    case "all": return conn.prepare("SELECT * FROM customers").all() as Customer[];
    case "with_email": return conn.prepare("SELECT * FROM customers WHERE email IS NOT NULL AND email != ''").all() as Customer[];
    case "with_phone": return conn.prepare("SELECT * FROM customers WHERE phone IS NOT NULL AND phone != ''").all() as Customer[];
    case "vip": return conn.prepare(`SELECT c.* FROM customers c JOIN sales s ON s.customer_id = c.id GROUP BY c.id HAVING SUM(s.total_cents) >= 150000`).all() as Customer[];
    case "recent": return conn.prepare(`SELECT DISTINCT c.* FROM customers c JOIN sales s ON s.customer_id = c.id WHERE s.sold_at >= datetime('now','-90 days')`).all() as Customer[];
    case "lapsed": return conn.prepare(`SELECT c.* FROM customers c WHERE c.id NOT IN (SELECT customer_id FROM sales WHERE customer_id IS NOT NULL AND sold_at >= datetime('now','-180 days'))`).all() as Customer[];
    case "rentals_only": return conn.prepare(`SELECT DISTINCT c.* FROM customers c JOIN appointments a ON a.customer_id = c.id WHERE a.type = 'rental'`).all() as Customer[];
    case "single": {
      const id = filter?.customer_id;
      if (!id) return [];
      const c = conn.prepare("SELECT * FROM customers WHERE id = ?").get(id) as Customer | undefined;
      return c ? [c] : [];
    }
    default: return [];
  }
}
