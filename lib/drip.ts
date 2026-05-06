import { many, one, exec } from "./db";
import { sendEmail, sendSms, renderTemplate } from "./integrations/messaging";
import type { DripFlow, DripFlowStep, DripEnrollment, Customer } from "./types";

export async function enrollInDripFlows(customerId: number, trigger: DripFlow["trigger"]): Promise<void> {
  const flows = await many<DripFlow>("SELECT * FROM drip_flows WHERE trigger = ? AND active = 1", [trigger]);
  for (const f of flows) {
    const exists = await one("SELECT id FROM drip_enrollments WHERE flow_id = ? AND customer_id = ? AND status = 'active'", [f.id, customerId]);
    if (exists) continue;
    const firstStep = await one<DripFlowStep>("SELECT * FROM drip_flow_steps WHERE flow_id = ? ORDER BY sequence ASC LIMIT 1", [f.id]);
    if (!firstStep) continue;
    const nextRun = new Date(Date.now() + firstStep.delay_days * 86400000).toISOString();
    await exec("INSERT INTO drip_enrollments (flow_id, customer_id, next_step, next_run_at) VALUES (?, ?, 1, ?)", [f.id, customerId, nextRun]);
  }
}

export async function runDripQueue(): Promise<{ processed: number; sent: number; errors: number }> {
  const due = await many<DripEnrollment>("SELECT * FROM drip_enrollments WHERE status = 'active' AND next_run_at <= datetime('now')");
  let sent = 0, errors = 0;
  for (const e of due) {
    const step = await one<DripFlowStep>("SELECT * FROM drip_flow_steps WHERE flow_id = ? AND sequence = ?", [e.flow_id, e.next_step]);
    const customer = await one<Customer>("SELECT * FROM customers WHERE id = ?", [e.customer_id]);
    if (!step || !customer) {
      await exec("UPDATE drip_enrollments SET status = 'complete' WHERE id = ?", [e.id]);
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

    const next = await one<DripFlowStep>("SELECT * FROM drip_flow_steps WHERE flow_id = ? AND sequence = ?", [e.flow_id, e.next_step + 1]);
    if (next) {
      const t = new Date(Date.now() + next.delay_days * 86400000).toISOString();
      await exec("UPDATE drip_enrollments SET next_step = next_step + 1, next_run_at = ? WHERE id = ?", [t, e.id]);
    } else {
      await exec("UPDATE drip_enrollments SET status = 'complete' WHERE id = ?", [e.id]);
    }
  }
  return { processed: due.length, sent, errors };
}
