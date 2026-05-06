"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer, GroupOrder } from "@/lib/types";

export default function NewAppointmentForm({
  customers, groups, defaultCustomerId, defaultGroupId, defaultType,
}: {
  customers: Customer[]; groups: GroupOrder[]; defaultCustomerId: number | null; defaultGroupId: number | null; defaultType: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({
    type: defaultType,
    customer_id: defaultCustomerId?.toString() || "",
    group_order_id: defaultGroupId?.toString() || "",
    customer_name: defaultCustomerId ? (customers.find((c) => c.id === defaultCustomerId)?.name || "") : "",
    customer_phone: "",
    customer_email: "",
    appointment_date: new Date(Date.now() + 86400000).toISOString().slice(0, 16),
    event_date: "",
    garment_expected_date: "",
    rental_pickup_date: "",
    rental_return_date: "",
    garment_description: "",
    fabric: "",
    style_notes: "",
    deposit: "0.00",
    total: "0.00",
    notes: "",
  });

  function onPickCustomer(id: string) {
    const c = customers.find((c) => c.id.toString() === id);
    setV((x) => ({ ...x, customer_id: id, customer_name: c?.name || x.customer_name, customer_phone: c?.phone || x.customer_phone, customer_email: c?.email || x.customer_email }));
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const total = Math.round(parseFloat(v.total || "0") * 100);
    const deposit = Math.round(parseFloat(v.deposit || "0") * 100);
    const r = await fetch("/api/appointments", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...v,
        customer_id: v.customer_id ? Number(v.customer_id) : null,
        group_order_id: v.group_order_id ? Number(v.group_order_id) : null,
        total_cents: total,
        deposit_cents: deposit,
        balance_cents: Math.max(0, total - deposit),
      }),
    });
    if (r.ok) {
      const j = await r.json();
      router.push(`/appointments/${j.id}`);
    } else { setBusy(false); }
  }

  const isRental = v.type === "rental";
  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
      <Field label="Type">
        <select className="select" value={v.type} onChange={(e) => setV({ ...v, type: e.target.value })}>
          <option value="custom_suit">Custom suit</option>
          <option value="rental">Rental</option>
          <option value="fitting">Fitting</option>
          <option value="alteration">Alteration</option>
          <option value="consultation">Consultation</option>
        </select>
      </Field>
      <Field label="Group order (optional)">
        <select className="select" value={v.group_order_id} onChange={(e) => setV({ ...v, group_order_id: e.target.value })}>
          <option value="">— Single order —</option>
          {groups.map((g) => <option key={g.id} value={g.id}>{g.name} {g.event_date ? `· ${g.event_date}` : ""}</option>)}
        </select>
      </Field>
      <Field label="Customer">
        <select className="select" value={v.customer_id} onChange={(e) => onPickCustomer(e.target.value)}>
          <option value="">— New / Walk-in —</option>
          {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </Field>
      <Field label="Customer name *"><input className="input" value={v.customer_name} onChange={(e) => setV({ ...v, customer_name: e.target.value })} required /></Field>
      <Field label="Phone"><input className="input" value={v.customer_phone} onChange={(e) => setV({ ...v, customer_phone: e.target.value })} /></Field>
      <Field label="Email"><input className="input" value={v.customer_email} onChange={(e) => setV({ ...v, customer_email: e.target.value })} /></Field>
      <Field label="Appointment date / time *"><input type="datetime-local" className="input" value={v.appointment_date} onChange={(e) => setV({ ...v, appointment_date: e.target.value })} required /></Field>
      <Field label="Event date"><input type="date" className="input" value={v.event_date} onChange={(e) => setV({ ...v, event_date: e.target.value })} /></Field>
      {!isRental && (
        <Field label="Garment expected"><input type="date" className="input" value={v.garment_expected_date} onChange={(e) => setV({ ...v, garment_expected_date: e.target.value })} /></Field>
      )}
      {isRental && <>
        <Field label="Rental pickup"><input type="date" className="input" value={v.rental_pickup_date} onChange={(e) => setV({ ...v, rental_pickup_date: e.target.value })} /></Field>
        <Field label="Rental return"><input type="date" className="input" value={v.rental_return_date} onChange={(e) => setV({ ...v, rental_return_date: e.target.value })} /></Field>
      </>}
      <div className="md:col-span-2"><Field label="Garment description"><input className="input" value={v.garment_description} onChange={(e) => setV({ ...v, garment_description: e.target.value })} /></Field></div>
      <Field label="Fabric"><input className="input" value={v.fabric} onChange={(e) => setV({ ...v, fabric: e.target.value })} /></Field>
      <Field label="Style notes"><input className="input" value={v.style_notes} onChange={(e) => setV({ ...v, style_notes: e.target.value })} /></Field>
      <Field label="Total ($)"><input className="input mono" value={v.total} onChange={(e) => setV({ ...v, total: e.target.value })} /></Field>
      <Field label="Deposit ($)"><input className="input mono" value={v.deposit} onChange={(e) => setV({ ...v, deposit: e.target.value })} /></Field>
      <div className="md:col-span-2"><Field label="Internal notes"><textarea rows={2} className="textarea" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field></div>

      <div className="md:col-span-2 flex justify-end"><button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : "Create appointment"}</button></div>
    </form>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="label mb-1.5">{label}</div>{children}</label>;
}
