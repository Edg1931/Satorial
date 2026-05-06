"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function RunQueue({ dueNow }: { dueNow: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  async function run() {
    setBusy(true);
    const r = await fetch("/api/drips/run", { method: "POST" });
    const j = await r.json();
    setBusy(false);
    setMsg(`Processed ${j.processed} · sent ${j.sent} · errors ${j.errors}`);
    router.refresh();
  }

  return (
    <div className="flex items-center gap-3">
      {msg && <div className="text-xs text-[var(--ink-soft)]">{msg}</div>}
      <button onClick={run} disabled={busy || dueNow === 0} className="btn btn-primary">{busy ? "Running…" : `Run queue (${dueNow})`}</button>
    </div>
  );
}
