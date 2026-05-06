import { NextRequest, NextResponse } from "next/server";
import { exec, many, one } from "@/lib/db";
import { sendEmail, sendSms, renderTemplate } from "@/lib/integrations/messaging";
import type { Customer } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name || !body.body) return NextResponse.json({ error: "name and body required" }, { status: 400 });
  const r = await exec(`
    INSERT INTO campaigns (name, channel, audience, audience_filter, subject, body, trigger_type, trigger_config, status, scheduled_for)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
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
  ]);
  const id = r.insertId;

  if (!body.send_now) return NextResponse.json({ id, recipients: 0 });

  const recipients = await resolveAudience(body.audience, body.audience_filter || null);
  let okCount = 0;
  for (const c of recipients) {
    const ctx = { name: c.name, first_name: c.name.split(" ")[0] || c.name, shop_name: "Satorial" };
    const subject = body.subject ? renderTemplate(body.subject, ctx) : "";
    const text = renderTemplate(body.body, ctx);
    if ((body.channel === "email" || body.channel === "both") && c.email) {
      const html = `<div style="font-family:Georgia,serif;font-size:15px;line-height:1.55">${text.replace(/\n/g, "<br/>")}</div>`;
      const res = await sendEmail({ to: c.email, subject, html });
      await exec(`INSERT INTO campaign_sends (campaign_id, customer_id, channel, address, status, provider_id, error) VALUES (?, ?, 'email', ?, ?, ?, ?)`,
        [id, c.id, c.email, res.ok ? "ok" : "failed", res.id || null, res.error || null]);
      if (res.ok) okCount++;
    }
    if ((body.channel === "sms" || body.channel === "both") && c.phone) {
      const res = await sendSms({ to: c.phone, body: text });
      await exec(`INSERT INTO campaign_sends (campaign_id, customer_id, channel, address, status, provider_id, error) VALUES (?, ?, 'sms', ?, ?, ?, ?)`,
        [id, c.id, c.phone, res.ok ? "ok" : "failed", res.id || null, res.error || null]);
      if (res.ok) okCount++;
    }
  }
  await exec("UPDATE campaigns SET status = 'sent', sent_at = datetime('now'), stats = ? WHERE id = ?",
    [JSON.stringify({ recipients: recipients.length, sends: okCount }), id]);

  return NextResponse.json({ id, recipients: recipients.length, sends: okCount });
}

async function resolveAudience(audience: string, filter: any): Promise<Customer[]> {
  switch (audience) {
    case "all": return many<Customer>("SELECT * FROM customers");
    case "with_email": return many<Customer>("SELECT * FROM customers WHERE email IS NOT NULL AND email != ''");
    case "with_phone": return many<Customer>("SELECT * FROM customers WHERE phone IS NOT NULL AND phone != ''");
    case "vip": return many<Customer>(`SELECT c.* FROM customers c JOIN sales s ON s.customer_id = c.id GROUP BY c.id HAVING SUM(s.total_cents) >= 150000`);
    case "recent": return many<Customer>(`SELECT DISTINCT c.* FROM customers c JOIN sales s ON s.customer_id = c.id WHERE s.sold_at >= datetime('now','-90 days')`);
    case "lapsed": return many<Customer>(`SELECT c.* FROM customers c WHERE c.id NOT IN (SELECT customer_id FROM sales WHERE customer_id IS NOT NULL AND sold_at >= datetime('now','-180 days'))`);
    case "rentals_only": return many<Customer>(`SELECT DISTINCT c.* FROM customers c JOIN appointments a ON a.customer_id = c.id WHERE a.type = 'rental'`);
    case "single": {
      const id = filter?.customer_id;
      if (!id) return [];
      const c = await one<Customer>("SELECT * FROM customers WHERE id = ?", [id]);
      return c ? [c] : [];
    }
    default: return [];
  }
}
