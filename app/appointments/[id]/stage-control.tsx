"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

const STAGES = ["scheduled", "measured", "cut", "first_fitting", "second_fitting", "ready", "delivered", "cancelled"];

export default function StageControl({ id, stage }: { id: number; stage: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [s, setS] = useState(stage);

  async function setStage(next: string) {
    setBusy(true);
    setS(next);
    await fetch(`/api/appointments/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stage: next, ...(next === "delivered" ? { garment_delivered_date: new Date().toISOString().slice(0, 10) } : {}) }),
    });
    setBusy(false);
    router.refresh();
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="label">Set stage</span>
      {STAGES.map((stg) => (
        <button
          key={stg}
          type="button"
          disabled={busy}
          onClick={() => setStage(stg)}
          className={`btn ${s === stg ? "btn-primary" : ""}`}
        >
          {stg.replace("_", " ")}
        </button>
      ))}
    </div>
  );
}
