"use client";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import type { Customer, Item } from "@/lib/types";
import { dollars } from "@/lib/format";

type Line = { item: Item; quantity: number };

export default function NewSaleForm({ items, customers }: { items: Item[]; customers: Customer[] }) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState(0);
  const [taxRate, setTaxRate] = useState(0);
  const [customer, setCustomer] = useState<string>("");
  const [customerId, setCustomerId] = useState<number | null>(null);
  const [method, setMethod] = useState("Card");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (!q) return items.slice(0, 12);
    const t = q.toLowerCase();
    return items.filter((i) =>
      i.name.toLowerCase().includes(t) || i.sku.toLowerCase().includes(t) ||
      (i.color || "").toLowerCase().includes(t) || (i.size || "").toLowerCase().includes(t) ||
      i.barcode.includes(t)
    ).slice(0, 12);
  }, [items, q]);

  function add(it: Item) {
    setLines((ls) => {
      const ex = ls.find((l) => l.item.id === it.id);
      if (ex) return ls.map((l) => (l.item.id === it.id ? { ...l, quantity: Math.min(it.quantity, l.quantity + 1) } : l));
      return [...ls, { item: it, quantity: 1 }];
    });
  }
  function setQty(id: number, qty: number) {
    setLines((ls) => ls.map((l) => (l.item.id === id ? { ...l, quantity: Math.max(1, Math.min(l.item.quantity, qty)) } : l)));
  }
  function remove(id: number) { setLines((ls) => ls.filter((l) => l.item.id !== id)); }

  const subtotal = lines.reduce((a, l) => a + l.item.price_cents * l.quantity, 0);
  const discountCents = Math.round(discount * 100);
  const taxable = Math.max(0, subtotal - discountCents);
  const taxCents = Math.round((taxable * taxRate) / 100);
  const total = taxable + taxCents;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (lines.length === 0) { setMsg("Add at least one item."); return; }
    setBusy(true);
    setMsg(null);
    const r = await fetch("/api/sales", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customer_id: customerId,
        customer_name: customer || null,
        payment_method: method,
        discount_cents: discountCents,
        tax_cents: taxCents,
        lines: lines.map((l) => ({ item_id: l.item.id, quantity: l.quantity, unit_price_cents: l.item.price_cents })),
      }),
    });
    if (r.ok) router.push("/sales");
    else { setMsg("Failed to record sale."); setBusy(false); }
  }

  return (
    <form onSubmit={submit} className="grid lg:grid-cols-5 gap-6">
      <div className="lg:col-span-3 space-y-4">
        <div>
          <input className="input" placeholder="Search or scan SKU/barcode/name…" value={q} onChange={(e) => setQ(e.target.value)} autoFocus />
        </div>
        <div className="grid sm:grid-cols-2 gap-2 max-h-[420px] overflow-y-auto scrollbar pr-1">
          {filtered.map((it) => (
            <button type="button" key={it.id} onClick={() => add(it)} className="text-left card p-3 card-hover">
              <div className="text-sm font-medium">{it.name}</div>
              <div className="text-[11px] text-[var(--ink-mute)] mt-0.5">{[it.color, it.size].filter(Boolean).join(" · ")} · {it.sku}</div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-sm">{dollars(it.price_cents)}</span>
                <span className="text-[11px] text-[var(--ink-soft)]">{it.quantity} on hand</span>
              </div>
            </button>
          ))}
          {filtered.length === 0 && <div className="text-sm text-[var(--ink-mute)]">No matches.</div>}
        </div>
      </div>

      <div className="lg:col-span-2 space-y-4">
        <div className="card p-4">
          <div className="label mb-2">Ticket</div>
          {lines.length === 0 ? (
            <div className="text-sm text-[var(--ink-mute)]">Pick items from the left.</div>
          ) : (
            <div className="space-y-2">
              {lines.map((l) => (
                <div key={l.item.id} className="flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="truncate">{l.item.name}</div>
                    <div className="text-[11px] text-[var(--ink-mute)]">{[l.item.color, l.item.size].filter(Boolean).join(" · ")}</div>
                  </div>
                  <input type="number" min={1} max={l.item.quantity} className="input w-16 text-center mono" value={l.quantity} onChange={(e) => setQty(l.item.id, Number(e.target.value))} />
                  <div className="w-20 text-right mono">{dollars(l.item.price_cents * l.quantity)}</div>
                  <button type="button" onClick={() => remove(l.item.id)} className="text-[var(--ink-mute)] hover:text-[var(--bad)]">✕</button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card p-4 space-y-3">
          <Field label="Customer">
            <select className="select mb-2" value={customerId ?? ""} onChange={(e) => {
              const id = e.target.value ? Number(e.target.value) : null;
              setCustomerId(id);
              const c = customers.find((c) => c.id === id);
              if (c) setCustomer(c.name);
            }}>
              <option value="">— Walk-in or new —</option>
              {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input className="input" placeholder="Or type a name" value={customer} onChange={(e) => setCustomer(e.target.value)} />
          </Field>
          <Field label="Payment method">
            <select className="select" value={method} onChange={(e) => setMethod(e.target.value)}>
              <option>Card</option><option>Cash</option><option>Apple Pay</option><option>Account</option>
            </select>
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Discount ($)"><input type="number" min={0} step="0.01" className="input mono" value={discount} onChange={(e) => setDiscount(Number(e.target.value))} /></Field>
            <Field label="Tax (%)"><input type="number" min={0} step="0.01" className="input mono" value={taxRate} onChange={(e) => setTaxRate(Number(e.target.value))} /></Field>
          </div>
          <div className="divider" />
          <Row k="Subtotal" v={dollars(subtotal)} />
          <Row k="Discount" v={`− ${dollars(discountCents)}`} />
          <Row k="Tax" v={dollars(taxCents)} />
          <Row k="Total" v={<span className="serif text-2xl">{dollars(total)}</span>} bold />
          {msg && <div className="text-sm text-[var(--bad)]">{msg}</div>}
          <button disabled={busy} className="btn btn-primary w-full justify-center">{busy ? "Recording…" : "Complete sale"}</button>
        </div>
      </div>
    </form>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="label mb-1.5">{label}</div>{children}</label>;
}
function Row({ k, v, bold }: { k: string; v: React.ReactNode; bold?: boolean }) {
  return (
    <div className={`flex items-center justify-between text-sm ${bold ? "" : "text-[var(--ink-soft)]"}`}>
      <span>{k}</span><span>{v}</span>
    </div>
  );
}
