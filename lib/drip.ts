import { db } from "./db";
import { sendEmail, sendSms, renderTemplate } from "./integrations/messaging";
import type { DripFlow, DripFlowStep, DripEnrollment, Customer } from "./types";

export function enrollInDripFlows(customerId: number, trigger: DripFlow["trigger"]) {
  const conn = db();
  const flows = conn.prepare("SELECT * FROM drip_flows WHERE trigger = ? AND active = 1").all(trigger) as DripFlow[];
  for (const f of flows) {
    const exists = conn.prepare("SELECT id FROM drip_enrollments WHERE flow_id = ? AND customer_id = ? AND status = 'active'").get(f.id, customerId);
    if (exists) continue;
    const firstStep = conn.prepare("SELECT * FROM drip_flow_steps WHERE flow_id = ? ORDER BY sequence ASC LIMIT 1").get(f.id) as DripFlowStep | undefined;
    if (!firstStep) continue;
    const nextRun = new Date(Date.now() + firstStep.delay_days * 86400000).toISOString();
    conn.prepare("INSERT INTO drip_enrollments (flow_id, customer_id, next_step, next_run_at) VALUES (?, ?, 1, ?)").run(f.id, customerId, nextRun);
  }
}

export async function runDripQueue(): Promise<{ processed: number; sent: number; errors: number }> {
  const conn = db();
  const due = conn.prepare(`
    SELECT * FROM drip_enrollments WHERE status = 'active' AND next_run_at <= datetime('now')
  `).all() as DripEnrollment[];
  let sent = 0, errors = 0;
  for (const e of due) {
    const step = conn.prepare("SELECT * FROM drip_flow_steps WHERE flow_id = ? AND sequence = ?").get(e.flow_id, e.next_step) as DripFlowStep | undefined;
    const customer = conn.prepare("SELECT * FROM customers WHERE id = ?").get(e.customer_id) as Customer | undefined;
    if (!step || !customer) {
      conn.prepare("UPDATE drip_enrollments SET status = 'complete' WHERE id = ?").run(e.id);
      continue;
    }
    const ctx = { name: customer.name, first_name: customer.name.split(" ")[0] || customer.name, shop_name: "Satorial" };
    const subject = step.subject ? renderTemplate(step.subject, ctx) : "";
    const body = renderTemplate(step.body, ctx);
    let ok = false;
    try {
      if (step.channel === "email" && customer.email) {
        const r = await sendEmail({ to: customer.email, subject, html: body.replace(/\n/g, "<br/>") });
        ok = r.ok;
      } else if (step.channel === "sms" && customer.phone) {
        const r = await sendSms({ to: customer.phone, body });
        ok = r.ok;
      } else {
        ok = true;
      }
    } catch { ok = false; }
    if (ok) sent++; else errors++;

    const next = conn.prepare("SELECT * FROM drip_flow_steps WHERE flow_id = ? AND sequence = ?").get(e.flow_id, e.next_step + 1) as DripFlowStep | undefined;
    if (next) {
      const t = new Date(Date.now() + next.delay_days * 86400000).toISOString();
      conn.prepare("UPDATE drip_enrollments SET next_step = next_step + 1, next_run_at = ? WHERE id = ?").run(t, e.id);
    } else {
      conn.prepare("UPDATE drip_enrollments SET status = 'complete' WHERE id = ?").run(e.id);
    }
  }
  return { processed: due.length, sent, errors };
}
