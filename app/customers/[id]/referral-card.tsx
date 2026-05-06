"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Chip } from "@/components/ui";
import { dollars, shortDate } from "@/lib/format";

export default function ReferralCard({ customerId, customerName, existing }: { customerId: number; customerName: string; existing: any[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [reward, setReward] = useState(50);

  async function generate() {
    setBusy(true);
    await fetch("/api/referrals", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ referrer_customer_id: customerId, reward_credit_cents: Math.round(reward * 100) }),
    });
    setBusy(false);
    router.refresh();
  }

  const totalCredits = existing.filter((r) => r.status === "redeemed").reduce((a, b) => a + b.reward_credit_cents, 0);

  return (
    <Card title="Referral codes">
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="text-sm text-[var(--ink-soft)]">Each code can be redeemed once. Credit lands on this customer's account when their referee buys.</div>
        <div className="flex items-center gap-2">
          <input type="number" className="input mono w-24" value={reward} onChange={(e) => setReward(Number(e.target.value))} />
          <span className="text-xs text-[var(--ink-mute)]">$ reward</span>
          <button onClick={generate} disabled={busy} className="btn btn-primary text-xs">+ Code</button>
        </div>
      </div>
      {existing.length === 0 ? (
        <div className="text-sm text-[var(--ink-mute)]">No codes yet.</div>
      ) : (
        <div className="space-y-2">
          {existing.map((r) => (
            <div key={r.id} className="flex items-center justify-between rounded-lg border border-[var(--line-soft)] p-2 text-sm">
              <span className="mono">{r.code}</span>
              <span className="text-[var(--ink-mute)] text-[11px]">Reward {dollars(r.reward_credit_cents)}</span>
              {r.status === "redeemed" ? <Chip tone="good">Redeemed {shortDate(r.redeemed_at)}</Chip> : <Chip tone="accent">Pending</Chip>}
            </div>
          ))}
          <div className="text-[11px] text-[var(--ink-mute)] text-right">Earned credits: {dollars(totalCredits)}</div>
        </div>
      )}
    </Card>
  );
}
