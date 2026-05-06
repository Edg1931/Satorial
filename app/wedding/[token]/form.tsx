"use client";
import { useState } from "react";

const SIZE_FIELDS: Array<[string, string]> = [
  ["chest", "Chest"], ["waist", "Waist"], ["hips", "Hips"],
  ["shoulder", "Shoulder"], ["sleeve_l", "Sleeve L"], ["neck", "Neck"],
  ["jacket_length", "Jacket length"], ["inseam", "Inseam"], ["shoe_size", "Shoe size"],
];

export default function WeddingPortalForm({ token }: { token: string }) {
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({ name: "", email: "", phone: "", suit_size: "", suggested_size: "", notes: "" });
  const [meas, setMeas] = useState<Record<string, string>>({});

  function setM(k: string, val: string) { setMeas((s) => ({ ...s, [k]: val })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const measurements: any = {};
    for (const [k] of SIZE_FIELDS) if (meas[k]) measurements[k] = parseFloat(meas[k]);
    const r = await fetch(`/api/wedding/${token}/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, measurements }),
    });
    setBusy(false);
    if (r.ok) setDone(true);
  }

  if (done) {
    return (
      <div className="text-center py-8">
        <div className="serif text-2xl">Thank you.</div>
        <div className="text-[var(--ink-soft)] mt-2 text-sm">We'll be in touch about your fitting and pickup window.</div>
      </div>
    );
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid md:grid-cols-2 gap-3">
        <Field label="Full name *"><input className="input" required value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
        <Field label="Phone *"><input className="input" required value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>
        <Field label="Email"><input className="input" type="email" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
        <Field label="Off-the-rack suit size you usually wear"><input className="input" placeholder="e.g. 42R" value={v.suit_size} onChange={(e) => setV({ ...v, suit_size: e.target.value })} /></Field>
      </div>

      <div>
        <div className="label mb-2">Measurements (inches — leave blank if unsure, we'll measure at fitting)</div>
        <div className="grid grid-cols-3 gap-2">
          {SIZE_FIELDS.map(([k, label]) => (
            <label key={k} className="block">
              <div className="text-[10px] uppercase tracking-wider text-[var(--ink-mute)] mb-1">{label}</div>
              <input className="input mono text-sm" inputMode="decimal" value={meas[k] || ""} onChange={(e) => setM(k, e.target.value)} />
            </label>
          ))}
        </div>
      </div>

      <Field label="Notes / preferences"><textarea rows={2} className="textarea" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field>

      <button disabled={busy} className="btn btn-primary w-full justify-center">{busy ? "Submitting…" : "Submit"}</button>
    </form>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><div className="label mb-1.5">{label}</div>{children}</label>; }
