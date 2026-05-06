"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function NewStyleForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [v, setV] = useState({
    style_code: "",
    name: "",
    category: "Suits",
    brand: "Satorial",
    description: "",
    base_price: "0.00",
    base_cost: "0.00",
    is_rental: false,
    colors: "Navy, Charcoal",
    sizes: "38R, 40R, 42R, 44R",
    qty_each: 2,
    reorder_each: 1,
    supplier: "",
    location: "",
    material: "",
  });

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/styles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...v,
        base_price_cents: Math.round(parseFloat(v.base_price || "0") * 100),
        base_cost_cents: Math.round(parseFloat(v.base_cost || "0") * 100),
        is_rental: v.is_rental ? 1 : 0,
        colors: v.colors.split(",").map((s) => s.trim()).filter(Boolean),
        sizes: v.sizes.split(",").map((s) => s.trim()).filter(Boolean),
      }),
    });
    if (r.ok) {
      router.push("/inventory");
    } else {
      const j = await r.json().catch(() => ({}));
      setMsg(j.error || "Failed");
      setBusy(false);
    }
  };

  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
      <Field label="Style code"><input className="input mono" placeholder="e.g. ST-WOOL-2P" value={v.style_code} onChange={(e) => setV({ ...v, style_code: e.target.value.toUpperCase() })} required /></Field>
      <Field label="Name"><input className="input" value={v.name} onChange={(e) => setV({ ...v, name: e.target.value })} required /></Field>
      <Field label="Category"><input className="input" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })} /></Field>
      <Field label="Brand"><input className="input" value={v.brand} onChange={(e) => setV({ ...v, brand: e.target.value })} /></Field>
      <Field label="Material"><input className="input" value={v.material} onChange={(e) => setV({ ...v, material: e.target.value })} /></Field>
      <Field label="Supplier"><input className="input" value={v.supplier} onChange={(e) => setV({ ...v, supplier: e.target.value })} /></Field>
      <Field label="Default location"><input className="input" value={v.location} onChange={(e) => setV({ ...v, location: e.target.value })} /></Field>
      <label className="flex items-center gap-2 mt-6"><input type="checkbox" checked={v.is_rental} onChange={(e) => setV({ ...v, is_rental: e.target.checked })} /> <span>Rental fleet</span></label>
      <Field label="Base cost ($)"><input className="input mono" value={v.base_cost} onChange={(e) => setV({ ...v, base_cost: e.target.value })} /></Field>
      <Field label="Base price ($)"><input className="input mono" value={v.base_price} onChange={(e) => setV({ ...v, base_price: e.target.value })} /></Field>
      <div className="md:col-span-2"><Field label="Description"><textarea className="textarea" rows={2} value={v.description} onChange={(e) => setV({ ...v, description: e.target.value })} /></Field></div>
      <div className="md:col-span-2 divider my-2" />
      <div className="md:col-span-2"><div className="label mb-1">Generate variants</div><div className="text-xs text-[var(--ink-mute)]">Comma-separated. We'll create one SKU per color × size combination.</div></div>
      <Field label="Colors"><input className="input" value={v.colors} onChange={(e) => setV({ ...v, colors: e.target.value })} /></Field>
      <Field label="Sizes"><input className="input" value={v.sizes} onChange={(e) => setV({ ...v, sizes: e.target.value })} /></Field>
      <Field label="Initial quantity each"><input type="number" className="input" value={v.qty_each} onChange={(e) => setV({ ...v, qty_each: Number(e.target.value) })} /></Field>
      <Field label="Reorder point each"><input type="number" className="input" value={v.reorder_each} onChange={(e) => setV({ ...v, reorder_each: Number(e.target.value) })} /></Field>

      <div className="md:col-span-2 flex items-center justify-between">
        {msg && <div className="text-sm text-[var(--bad)]">{msg}</div>}
        <button disabled={busy} className="btn btn-primary ml-auto">{busy ? "Creating…" : "Create style + variants"}</button>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="label mb-1.5">{label}</div>{children}</label>;
}
