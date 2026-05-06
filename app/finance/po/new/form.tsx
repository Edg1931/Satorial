"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

type Line = { name: string; sku: string; quantity: number; unit_cost: string };

export default function POForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({ supplier: "", expected_at: "", notes: "" });
  const [lines, setLines] = useState<Line[]>([{ name: "", sku: "", quantity: 1, unit_cost: "0.00" }]);

  function addLine() { setLines((l) => [...l, { name: "", sku: "", quantity: 1, unit_cost: "0.00" }]); }
  function setLine(i: number, k: keyof Line, val: any) { setLines((l) => l.map((x, idx) => idx === i ? { ...x, [k]: val } : x)); }
  function rmLine(i: number) { setLines((l) => l.filter((_, idx) => idx !== i)); }

  const total = lines.reduce((acc, l) => acc + l.quantity * Math.round(parseFloat(l.unit_cost || "0") * 100), 0);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/po", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...v,
        total_cents: total,
        lines: lines.map((l) => ({
          name: l.name, sku: l.sku, quantity: l.quantity,
          unit_cost_cents: Math.round(parseFloat(l.unit_cost || "0") * 100),
        })),
      }),
    });
    if (r.ok) router.push("/finance");
    else setBusy(false);
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid md:grid-cols-3 gap-4">
        <Field label="Supplier *"><input required className="input" value={v.supplier} onChange={(e) => setV({ ...v, supplier: e.target.value })} /></Field>
        <Field label="Expected"><input type="date" className="input" value={v.expected_at} onChange={(e) => setV({ ...v, expected_at: e.target.value })} /></Field>
        <Field label="Notes"><input className="input" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field>
      </div>
      <div className="card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="label">Line items</div>
          <button type="button" className="btn text-xs" onClick={addLine}>+ Line</button>
        </div>
        <div className="space-y-2">
          {lines.map((l, i) => (
            <div key={i} className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-5"><input className="input" placeholder="Item name" value={l.name} onChange={(e) => setLine(i, "name", e.target.value)} /></div>
              <div className="col-span-3"><input className="input mono" placeholder="SKU (optional)" value={l.sku} onChange={(e) => setLine(i, "sku", e.target.value.toUpperCase())} /></div>
              <div className="col-span-1"><input type="number" className="input text-center" value={l.quantity} onChange={(e) => setLine(i, "quantity", Number(e.target.value))} /></div>
              <div className="col-span-2"><input className="input mono" placeholder="Unit cost" value={l.unit_cost} onChange={(e) => setLine(i, "unit_cost", e.target.value)} /></div>
              <div className="col-span-1 text-right"><button type="button" onClick={() => rmLine(i)} className="text-[var(--ink-mute)] hover:text-[var(--bad)]">✕</button></div>
            </div>
          ))}
        </div>
      </div>
      <div className="flex items-center justify-between">
        <div className="text-sm text-[var(--ink-soft)]">Total: <span className="serif text-2xl text-[var(--ink)]">${(total / 100).toFixed(2)}</span></div>
        <button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : "Create PO"}</button>
      </div>
    </form>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><div className="label mb-1.5">{label}</div>{children}</label>; }
