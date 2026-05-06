"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const FIELDS: Array<[string, string]> = [
  ["chest", "Chest"], ["waist", "Waist"], ["hips", "Hips"], ["seat", "Seat"],
  ["shoulder", "Shoulder"], ["sleeve_l", "Sleeve L"], ["sleeve_r", "Sleeve R"],
  ["neck", "Neck"], ["bicep", "Bicep"], ["wrist", "Wrist"],
  ["jacket_length", "Jacket length"], ["back_length", "Back length"],
  ["inseam", "Inseam"], ["outseam", "Outseam"], ["thigh", "Thigh"], ["knee", "Knee"], ["trouser_rise", "Rise"],
  ["shoe_size", "Shoe size"],
];

export default function MeasurementForm({ customerId }: { customerId: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState<Record<string, string>>({ taken_by: "Owner", notes: "" });

  function set(k: string, val: string) { setV((s) => ({ ...s, [k]: val })); }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const payload: any = { customer_id: customerId, taken_by: v.taken_by, notes: v.notes };
    for (const [k] of FIELDS) {
      if (v[k]) payload[k] = parseFloat(v[k]);
    }
    const r = await fetch("/api/measurements", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    setBusy(false);
    if (r.ok) router.refresh();
  }

  return (
    <form onSubmit={submit} className="space-y-3">
      <div>
        <div className="label mb-1">Taken by</div>
        <input className="input" value={v.taken_by || ""} onChange={(e) => set("taken_by", e.target.value)} />
      </div>
      <div className="grid grid-cols-2 gap-2 max-h-80 overflow-y-auto scrollbar pr-1">
        {FIELDS.map(([k, label]) => (
          <label key={k} className="block">
            <div className="text-[10px] uppercase tracking-wider text-[var(--ink-mute)] mb-1">{label}</div>
            <input className="input mono text-sm" inputMode="decimal" value={v[k] || ""} onChange={(e) => set(k, e.target.value)} />
          </label>
        ))}
      </div>
      <textarea className="textarea" rows={2} placeholder="Notes" value={v.notes || ""} onChange={(e) => set("notes", e.target.value)} />
      <button disabled={busy} className="btn btn-primary w-full justify-center">{busy ? "Saving…" : "Save measurements"}</button>
    </form>
  );
}
