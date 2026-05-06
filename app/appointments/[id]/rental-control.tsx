"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const STATES = [
  { id: "reserved", label: "Reserved" },
  { id: "out", label: "Out" },
  { id: "late", label: "Late" },
  { id: "returned", label: "Returned" },
  { id: "cleaning", label: "Cleaning" },
  { id: "available", label: "Available" },
];

export default function RentalControl({ id, state, returnDate }: { id: number; state: string; returnDate: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [s, setS] = useState(state || "reserved");

  const isLate = !!returnDate && new Date(returnDate) < new Date() && s === "out";

  async function setState(next: string) {
    setBusy(true);
    setS(next);
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rental_state: next }),
    });
    setBusy(false);
    router.refresh();
  }

  const idx = STATES.findIndex((x) => x.id === s);
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar pb-2">
        {STATES.map((x, i) => {
          const done = i < idx;
          const cur = i === idx;
          return (
            <div key={x.id} className="flex items-center gap-2 shrink-0">
              <div className={`w-9 h-9 rounded-full grid place-items-center text-xs font-semibold border ${cur ? "bg-[var(--accent)] text-[#1a1408] border-[var(--accent)]" : done ? "bg-[var(--bg-elev-2)] border-[var(--good)] text-[var(--good)]" : "bg-[var(--bg)] border-[var(--line-soft)] text-[var(--ink-mute)]"}`}>{i + 1}</div>
              <div className={`text-xs uppercase tracking-wider ${cur ? "text-[var(--ink)]" : done ? "text-[var(--ink-soft)]" : "text-[var(--ink-mute)]"}`}>{x.label}</div>
              {i < STATES.length - 1 && <div className={`w-8 h-px ${i < idx ? "bg-[var(--good)]" : "bg-[var(--line-soft)]"}`} />}
            </div>
          );
        })}
      </div>
      {isLate && <div className="text-sm text-[var(--bad)]">⚠ Past due — return date was {returnDate}.</div>}
      <div className="flex flex-wrap gap-2">
        <span className="label">Set state</span>
        {STATES.map((x) => (
          <button key={x.id} type="button" disabled={busy} onClick={() => setState(x.id)} className={`btn ${s === x.id ? "btn-primary" : ""}`}>{x.label}</button>
        ))}
      </div>
    </div>
  );
}
