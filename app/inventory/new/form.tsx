"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import type { Style } from "@/lib/types";

export default function NewItemForm({ styles }: { styles: Style[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [v, setV] = useState({
    style_id: styles[0]?.id?.toString() || "",
    sku: "",
    name: "",
    category: "Suits",
    brand: "Satorial",
    color: "",
    size: "",
    material: "",
    cost: "0.00",
    price: "0.00",
    quantity: 1,
    reorder_point: 2,
    supplier: "",
    location: "",
    is_rental: false,
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/inventory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...v,
        style_id: v.style_id ? Number(v.style_id) : null,
        cost_cents: Math.round(parseFloat(v.cost || "0") * 100),
        price_cents: Math.round(parseFloat(v.price || "0") * 100),
        is_rental: v.is_rental ? 1 : 0,
      }),
    });
    if (r.ok) {
      const j = await r.json();
      router.push(`/inventory/${j.id}`);
    } else {
      const j = await r.json().catch(() => ({}));
      setMsg(j.error || "Failed");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
      <Field label="Master Style (optional)">
        <select className="select" value={v.style_id} onChange={(e) => {
          const s = styles.find((x) => x.id.toString() === e.target.value);
          setV({
            ...v,
            style_id: e.target.value,
            name: s?.name || v.name,
            category: s?.category || v.category,
            cost: s ? (s.base_cost_cents / 100).toFixed(2) : v.cost,
            price: s ? (s.base_price_cents / 100).toFixed(2) : v.price,
            is_rental: s ? !!s.is_rental : v.is_rental,
          });
        }}>
          <option value="">— Standalone item —</option>
          {styles.map((s) => <option key={s.id} value={s.id}>{s.name} · {s.style_code}</option>)}
        </select>
      </Field>
      <Field label="SKU"><input className="input mono" placeholder="e.g. ST-WOOL-NVY-40R" value={v.sku} onChange={(e) => setV({ ...v, sku: e.target.value.toUpperCase() })} required /></Field>
      <Field label="Name"><input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></Field>
      <Field label="Category"><input className="input" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} /></Field>
      <Field label="Color"><input className="input" value={v.color} onChange={(e) => setV({ ...v, color: e.target.value })} /></Field>
      <Field label="Size"><input className="input" value={v.size} onChange={(e) => setV({ ...v, size: e.target.value })} /></Field>
      <Field label="Material"><input className="input" value={v.material} onChange={(e) => setV({ ...v, material: e.target.value })} /></Field>
      <Field label="Supplier"><input className="input" value={v.supplier} onChange={(e) => setV({ ...v, supplier: e.target.value })} /></Field>
      <Field label="Location"><input className="input" value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} /></Field>
      <Field label="Reorder point"><input type="number" className="input" value={v.reorder_point} onChange={(e) => setV({ ...v, reorder_point: Number(e.target.value) })} /></Field>
      <Field label="Cost ($)"><input className="input mono" value={v.cost} onChange={(e) => setV({ ...v, cost: e.target.value })} /></Field>
      <Field label="Price ($)"><input className="input mono" value={v.price} onChange={(e) => setV({ ...v, price: e.target.value })} /></Field>
      <Field label="Quantity"><input type="number" className="input" value={v.quantity} onChange={(e) => setV({ ...v, quantity: Number(e.target.value) })} /></Field>
      <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={v.is_rental} onChange={(e) => setV({ ...v, is_rental: e.target.checked })} /> <span>Rental fleet item</span></label>

      <div className="md:col-span-2 flex items-center justify-between">
        {msg && <div className="text-sm text-[var(--bad)]">{msg}</div>}
        <button disabled={busy} className="btn btn-primary ml-auto">{busy ? "Saving…" : "Create item"}</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="label mb-1.5">{label}</div>{children}</label>;
}
