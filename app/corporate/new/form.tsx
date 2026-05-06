"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCorporateForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({ name: "", contact_name: "", contact_email: "", contact_phone: "", billing_email: "", stipend: "0.00", stipend_period: "annual", notes: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/corporate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, stipend_cents: Math.round(parseFloat(v.stipend || "0") * 100) }),
    });
    if (r.ok) {
      const j = await r.json();
      router.push(`/corporate/${j.id}`);
    } else setBusy(false);
  }

  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
      <Field label="Account name *"><input className="input" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
      <Field label="Contact name"><input className="input" value={v.contact_name} onChange={(e) => setV({ ...v, contact_name: e.target.value })} /></Field>
      <Field label="Contact email"><input className="input" value={v.contact_email} onChange={(e) => setV({ ...v, contact_email: e.target.value })} /></Field>
      <Field label="Contact phone"><input className="input" value={v.contact_phone} onChange={(e) => setV({ ...v, contact_phone: e.target.value })} /></Field>
      <Field label="Billing email"><input className="input" value={v.billing_email} onChange={(e) => setV({ ...v, billing_email: e.target.value })} /></Field>
      <Field label="Stipend per employee ($)"><input className="input mono" value={v.stipend} onChange={(e) => setV({ ...v, stipend: e.target.value })} /></Field>
      <Field label="Period">
        <select className="select" value={v.stipend_period} onChange={(e) => setV({ ...v, stipend_period: e.target.value })}>
          <option>annual</option><option>quarterly</option><option>monthly</option>
        </select>
      </Field>
      <div className="md:col-span-2"><Field label="Notes"><textarea rows={2} className="textarea" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field></div>
      <div className="md:col-span-2 flex justify-end"><button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : "Create account"}</button></div>
    </form>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><div className="label mb-1.5">{label}</div>{children}</label>; }
