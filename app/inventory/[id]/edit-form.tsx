"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Item } from "@/lib/types";

export default function EditItemForm({ item }: { item: Item }) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [v, setV] = useState({
    name: item.name,
    category: item.category,
    color: item.color || "",
    size: item.size || "",
    material: item.material || "",
    cost: (item.cost_cents / 100).toFixed(2),
    price: (item.price_cents / 100).toFixed(2),
    quantity: item.quantity,
    reorder_point: item.reorder_point,
    supplier: item.supplier || "",
    location: item.location || "",
    is_rental: !!item.is_rental,
    notes: item.notes || "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    const r = await fetch(`/api/inventory/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...v,
        cost_cents: Math.round(parseFloat(v.cost || "0") * 100),
        price_cents: Math.round(parseFloat(v.price || "0") * 100),
        is_rental: v.is_rental ? 1 : 0,
      }),
    });
    setSaving(false);
    if (r.ok) {
      setMsg("Saved.");
      router.refresh();
    } else {
      const j = await r.json().catch(() => ({}));
      setMsg(j.error || "Failed to save.");
    }
  };

  const onAdjust = async (delta: number) => {
    const r = await fetch(`/api/inventory/${item.id}/adjust`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ delta }),
    });
    if (r.ok) router.refresh();
  };

  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
      <Field label="Name"><input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} /></Field>
      <Field label="Category"><input className="input" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} /></Field>
      <Field label="Color"><input className="input" value={v.color} onChange={(e) => setV({ ...v, color: e.target.value })} /></Field>
      <Field label="Size"><input className="input" value={v.size} onChange={(e) => setV({ ...v, size: e.target.value })} /></Field>
      <Field label="Material"><input className="input" value={v.material} onChange={(e) => setV({ ...v, material: e.target.value })} /></Field>
      <Field label="Supplier"><input className="input" value={v.supplier} onChange={(e) => setV({ ...v, supplier: e.target.value })} /></Field>
      <Field label="Location"><input className="input" value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} /></Field>
      <Field label="Reorder point"><input type="number" min={0} className="input" value={v.reorder_point} onChange={(e) => setV({ ...v, reorder_point: Number(e.target.value) })} /></Field>
      <Field label="Cost ($)"><input className="input mono" value={v.cost} onChange={(e) => setV({ ...v, cost: e.target.value })} /></Field>
      <Field label="Price ($)"><input className="input mono" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} /></Field>
      <Field label="Quantity">
        <div className="flex items-center gap-2">
          <button type="button" className="btn" onClick={() => onAdjust(-1)}>−</button>
          <input type="number" min={0} className="input flex-1 text-center mono" value={v.quantity} onChange={(e) => setV({ ...v, quantity: Number(e.target.value) })} />
          <button type="button" className="btn" onClick={() => onAdjust(+1)}>+</button>
        </div>
      </Field>
      <Field label="Rental fleet?">
        <label className="flex items-center gap-2 h-10"><input type="checkbox" checked={v.is_rental} onChange={(e) => setV({ ...v, is_rental: e.target.checked })} /> <span className="text-sm">Track as rental</span></label>
      </Field>
      <div className="md:col-span-2"><Field label="Notes"><textarea className="textarea" rows={2} value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field></div>
      <div className="md:col-span-2 flex items-center justify-between">
        {msg && <div className="text-sm text-[var(--ink-soft)]">{msg}</div>}
        <button disabled={saving} className="btn btn-primary ml-auto">{saving ? "Saving…" : "Save changes"}</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="label mb-1.5">{label}</div>{children}</label>;
}
