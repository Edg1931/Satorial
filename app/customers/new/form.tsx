"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewCustomerForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({ name: "", email: "", phone: "", address: "", birthday: "", preferences: "", notes: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/customers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
    if (r.ok) {
      const j = await r.json();
      router.push(`/customers/${j.id}`);
    } else { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
      <Field label="Name *"><input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></Field>
      <Field label="Email"><input className="input" value={v.email} onChange={(e) => setV({ ...v, email: e.target.value })} /></Field>
      <Field label="Phone"><input className="input" value={v.phone} onChange={(e) => setV({ ...v, phone: e.target.value })} /></Field>
      <Field label="Birthday"><input type="date" className="input" value={v.birthday} onChange={(e) => setV({ ...v, birthday: e.target.value })} /></Field>
      <div className="md:col-span-2"><Field label="Address"><input className="input" value={v.address} onChange={(e) => setV({ ...v, address: e.target.value })} /></Field></div>
      <div className="md:col-span-2"><Field label="Preferences (cuts, fabrics, fits)"><textarea rows={2} className="textarea" value={v.preferences} onChange={(e) => setV({ ...v, preferences: e.target.value })} /></Field></div>
      <div className="md:col-span-2"><Field label="Notes"><textarea rows={2} className="textarea" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field></div>
      <div className="md:col-span-2 flex justify-end"><button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : "Create customer"}</button></div>
    </form>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="label mb-1.5">{label}</div>{children}</label>;
}
