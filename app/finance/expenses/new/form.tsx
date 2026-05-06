"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const CATEGORIES = ["Inventory", "Rent", "Utilities", "Payroll", "Marketing", "Software", "Supplies", "Tailoring", "Travel", "Insurance", "Other"];

export default function ExpenseForm() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({ occurred_at: new Date().toISOString().slice(0, 10), category: "Inventory", amount: "0.00", vendor: "", notes: "" });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const r = await fetch("/api/expenses", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...v, amount_cents: Math.round(parseFloat(v.amount || "0") * 100) }),
    });
    if (r.ok) router.push("/finance");
    else setBusy(false);
  }

  return (
    <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
      <Field label="Date"><input type="date" className="input" value={v.occurred_at} onChange={(e) => setV({ ...v, occurred_at: e.target.value })} /></Field>
      <Field label="Category">
        <select className="select" value={v.category} onChange={(e) => setV({ ...v, category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Field>
      <Field label="Vendor"><input className="input" value={v.vendor} onChange={(e) => setV({ ...v, vendor: e.target.value })} /></Field>
      <Field label="Amount ($)"><input className="input mono" value={v.amount} onChange={(e) => setV({ ...v, amount: e.target.value })} /></Field>
      <div className="md:col-span-2"><Field label="Notes"><textarea rows={2} className="textarea" value={v.notes} onChange={(e) => setV({ ...v, notes: e.target.value })} /></Field></div>
      <div className="md:col-span-2 flex justify-end"><button disabled={busy} className="btn btn-primary">{busy ? "Saving…" : "Log expense"}</button></div>
    </form>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) { return <label className="block"><div className="label mb-1.5">{label}</div>{children}</label>; }
