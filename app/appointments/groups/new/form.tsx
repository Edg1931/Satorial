"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewGroupForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({ name: "", event_type: "wedding", event_date: "", organizer_name: "", organizer_email: "", organizer_phone: "", notes: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/groups", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(v) });
    if (r.ok) {
      const j = await r.json();
      router.push(`/appointments/groups/${j.id}`);
    } else { setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
      <Field label="Group name *"><input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></Field>
      <Field label="Event type"><select className="select" value={v.event_type} onChange={(e) => setV({ ...v, event_type: e.target.value })}><option>wedding</option><option>prom</option><option>corporate</option><option>other</option></select></Field>
      <Field label="Event date"><input type="date" className="input" value={v.event_date} onChange={(e) => setV({ ...v, event_date: e.target.value })} /></Field>
      <Field label="Organizer name"><input className="input" value={v.organizer_name} onChange={(e) => setV({ ...v, organizer_name: e.target.value })} /></Field>
      <Field label="Organizer email"><input className="input" value={v.organizer_email} onChange={(e) => setV({ ...v, organizer_email: e.target.value })} /></Field>
      <Field label="Organizer phone"><input className="input" value={v.organizer_phone} onChange={(e) => setV({ ...v, organizer_phone: e.target.value })} /></Field>
      <div className="md:col-span-2"><Field label="Notes"><textarea rows={2} className="textarea" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field></div>
      <div className="md:col-span-2 flex justify-end"><button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : "Create group"}</button></div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="label mb-1.5">{label}</div>{children}</label>;
}
