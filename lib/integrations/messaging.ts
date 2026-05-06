import { getConfig } from "./clover";

export type EmailSendResult = { ok: boolean; id?: string; error?: string };
export type SmsSendResult = { ok: boolean; id?: string; error?: string };

export async function sendEmail(opts: { to: string; subject: string; html: string; from?: string }): Promise<EmailSendResult> {
  const cfg = (await getConfig("resend")) as { apiKey: string; from?: string } | null;
  if (!cfg?.apiKey) {
    return { ok: true, id: `sim-email-${Date.now()}` };
  }
  try {
    const r = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${cfg.apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: opts.from || cfg.from || "Satorial <noreply@satorial.local>",
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
      }),
    });
    const j = await r.json();
    if (!r.ok) return { ok: false, error: j.message || `HTTP ${r.status}` };
    return { ok: true, id: j.id };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export async function sendSms(opts: { to: string; body: string }): Promise<SmsSendResult> {
  const cfg = (await getConfig("twilio")) as { accountSid: string; authToken: string; from: string } | null;
  if (!cfg?.accountSid || !cfg?.authToken) {
    return { ok: true, id: `sim-sms-${Date.now()}` };
  }
  try {
    const auth = Buffer.from(`${cfg.accountSid}:${cfg.authToken}`).toString("base64");
    const params = new URLSearchParams({ To: opts.to, From: cfg.from, Body: opts.body });
    const r = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${cfg.accountSid}/Messages.json`, {
      method: "POST",
      headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
      body: params,
    });
    const j = await r.json();
    if (!r.ok) return { ok: false, error: j.message || `HTTP ${r.status}` };
    return { ok: true, id: j.sid };
  } catch (e: any) {
    return { ok: false, error: e?.message || String(e) };
  }
}

export function renderTemplate(template: string, vars: Record<string, string | number | null | undefined>): string {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k) => String(vars[k] ?? ""));
}
