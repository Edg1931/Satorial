"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer } from "@/lib/types";

const AUDIENCES = [
  { id: "all", label: "All customers" },
  { id: "with_email", label: "Customers with email" },
  { id: "with_phone", label: "Customers with phone" },
  { id: "vip", label: "VIPs (lifetime spend ≥ $1,500)" },
  { id: "recent", label: "Recent buyers (90 days)" },
  { id: "lapsed", label: "Lapsed (180+ days no purchase)" },
  { id: "rentals_only", label: "Rental customers" },
  { id: "single", label: "Specific customer" },
];

const TRIGGERS = [
  { id: "manual", label: "Send now / on-demand" },
  { id: "scheduled", label: "Scheduled — one-time" },
  { id: "birthday", label: "Birthday — recurring" },
  { id: "anniversary", label: "Purchase anniversary — recurring" },
  { id: "holiday", label: "Holiday — recurring" },
  { id: "event", label: "Event-based (appointment / event date)" },
];

export default function CampaignForm({ customers, template, customerId }: { customers: Customer[]; template?: string; customerId: number | null }) {
  const router = useRouter();
  const initial = templateDefaults(template, customers.find((c) => c.id === customerId));
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [v, setV] = useState({
    name: initial.name,
    channel: initial.channel,
    audience: customerId ? "single" : "with_email",
    audience_id: customerId?.toString() || "",
    subject: initial.subject,
    body: initial.body,
    trigger_type: "manual",
    scheduled_for: "",
    aiPrompt: "",
  });

  async function aiDraft() {
    if (!v.aiPrompt.trim()) { setMsg("Add a prompt for the AI."); return; }
    setBusy("ai");
    setMsg(null);
    const r = await fetch("/api/campaigns/draft", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: v.aiPrompt, channel: v.channel }),
    });
    const j = await r.json();
    if (j.subject) setV((s) => ({ ...s, subject: j.subject, body: j.body }));
    else setV((s) => ({ ...s, body: j.body || s.body }));
    setBusy(null);
  }

  async function save(action: "save" | "send") {
    setBusy(action);
    setMsg(null);
    const r = await fetch("/api/campaigns", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...v,
        audience_filter: v.audience === "single" ? { customer_id: v.audience_id ? Number(v.audience_id) : null } : null,
        send_now: action === "send",
      }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (r.ok) {
      if (action === "send") setMsg(`Sent to ${j.recipients ?? 0} recipient(s).`);
      else setMsg("Saved.");
      setTimeout(() => router.push("/campaigns"), 600);
    } else {
      setMsg(j.error || "Failed");
    }
  }

  const showSubject = v.channel !== "sms";
  return (
    <div className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Campaign name *"><input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></Field>
        <Field label="Channel">
          <select className="select" value={v.channel} onChange={(e) => setV({ ...v, channel: e.target.value })}>
            <option value="email">Email</option><option value="sms">SMS</option><option value="both">Both</option>
          </select>
        </Field>
        <Field label="Trigger">
          <select className="select" value={v.trigger_type} onChange={(e) => setV({ ...v, trigger_type: e.target.value })}>
            {TRIGGERS.map((t) => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
        </Field>
        <Field label="Audience">
          <select className="select" value={v.audience} onChange={(e) => setV({ ...v, audience: e.target.value })}>
            {AUDIENCES.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select>
        </Field>
        {v.audience === "single" && (
          <Field label="Customer">
            <select className="select" value={v.audience_id} onChange={(e) => setV({ ...v, audience_id: e.target.value })}>
              <option value="">— Pick —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </Field>
        )}
        {v.trigger_type === "scheduled" && (
          <Field label="Scheduled for"><input type="datetime-local" className="input" value={v.scheduled_for} onChange={(e) => setV({ ...v, scheduled_for: e.target.value })} /></Field>
        )}
      </div>

      <div className="card p-4 space-y-2">
        <div className="label">AI helper</div>
        <textarea rows={2} className="textarea" placeholder="e.g. 20% off summer suits this weekend; mention complimentary alterations" value={v.aiPrompt} onChange={(e) => setV({ ...v, aiPrompt: e.target.value })} />
        <div className="flex justify-end"><button type="button" onClick={aiDraft} disabled={busy !== null} className="btn">✦ {busy === "ai" ? "Drafting…" : "Draft with AI"}</button></div>
      </div>

      {showSubject && (
        <Field label="Subject"><input className="input" value={v.subject} onChange={(e) => setV({ ...v, subject: e.target.value })} /></Field>
      )}
      <Field label="Body">
        <textarea rows={10} className="textarea" value={v.body} onChange={(e) => setV({ ...v, body: e.target.value })} />
        <div className="text-[11px] text-[var(--ink-mute)] mt-1">Tokens you can use: <span className="kbd">{"{{name}}"}</span> <span className="kbd">{"{{first_name}}"}</span> <span className="kbd">{"{{shop_name}}"}</span></div>
      </Field>

      <div className="flex items-center justify-between">
        {msg && <div className="text-sm text-[var(--ink-soft)]">{msg}</div>}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={() => save("save")} className="btn" disabled={busy !== null}>{busy === "save" ? "Saving…" : "Save"}</button>
          <button onClick={() => save("send")} className="btn btn-primary" disabled={busy !== null}>{busy === "send" ? "Sending…" : v.trigger_type === "manual" ? "Send now" : "Save & activate"}</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><div className="label mb-1.5">{label}</div>{children}</label>; }

function templateDefaults(template: string | undefined, c: Customer | undefined) {
  switch (template) {
    case "Birthday":
      return {
        name: c ? `Birthday — ${c.name}` : "Birthday wishes",
        channel: "email",
        subject: "A note on your birthday",
        body: `Hi {{first_name}},\n\nWarmest birthday wishes from all of us at {{shop_name}}. As a small gift, enjoy 15% off any purchase this month — just mention this note.\n\nWith style,\nThe Satorial team`,
      };
    case "Anniversary":
      return { name: "Customer anniversary", channel: "email", subject: "It's been a year — and we appreciate you", body: "Hi {{first_name}},\n\nA year ago you joined the Satorial book. Thank you for trusting us with your wardrobe. Drop in any time — first round of espresso is on us.\n\n— The Satorial team" };
    case "Sale announcement":
      return { name: "Storewide sale", channel: "both", subject: "A rare moment: 20% off the floor", body: "Hi {{first_name}},\n\nFor a few days only, take 20% off the floor — including made-to-measure orders placed this week. Visit us downtown or reply to book your fitting.\n\n— Satorial" };
    case "Holiday — Father's Day":
      return { name: "Father's Day", channel: "email", subject: "Thoughtful gifts for the well-dressed dad", body: "Hi {{first_name}},\n\nGift cards in any denomination, hand-chosen accessories, and a complimentary monogram on shirts ordered this week. Visit us in store or reply for our concierge selections.\n\n— Satorial" };
    case "Holiday — Christmas":
      return { name: "Christmas hours + tailoring deadlines", channel: "both", subject: "Holiday hours and last-order dates", body: "Hi {{first_name}},\n\nLast date for in-house alterations before Christmas Eve: Dec 18. Holiday hours below. Wishing you a tasteful season.\n\n— Satorial" };
    case "Wedding season":
      return { name: "Wedding season — group bookings", channel: "email", subject: "Booking your wedding party", body: "Hi {{first_name}},\n\nWe're now booking spring weddings. Group rentals start at $99/person and we coordinate everything from measurements to delivery. Reply with your event date to get on our calendar.\n\n— Satorial" };
    case "New arrival":
      return { name: "New arrival", channel: "email", subject: "New arrivals you should see first", body: "Hi {{first_name}},\n\nA fresh shipment from Milano Mills landed this morning — featuring a navy windowpane and the year's most subtle charcoal sharkskin. First fittings opening up this week.\n\n— Satorial" };
    case "Appointment reminder (24h)":
      return { name: "Appointment reminder", channel: "sms", subject: "", body: "Hi {{first_name}}, just a reminder of your fitting tomorrow at Satorial. Reply Y to confirm or call us if you need to reschedule." };
    default:
      return { name: "", channel: "email", subject: "", body: "" };
  }
}
