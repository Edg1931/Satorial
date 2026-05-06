"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function MarkPaid({ id }: { id: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  async function pay() {
    setBusy(true);
    await fetch(`/api/commissions/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ paid_at: new Date().toISOString() }) });
    setBusy(false);
    router.refresh();
  }
  return <button onClick={pay} disabled={busy} className="btn text-xs">{busy ? "…" : "Mark paid"}</button>;
}
