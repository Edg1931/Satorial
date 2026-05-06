import Link from "next/link";
import { db } from "@/lib/db";
import { Card, Chip, PageHeader, Stat } from "@/components/ui";
import { dollars, shortDate } from "@/lib/format";
import MarkPaid from "./mark-paid";

export const dynamic = "force-dynamic";

export default function CommissionsPage() {
  const conn = db();
  const rows = conn.prepare(`
    SELECT c.*, s.name AS staff_name, sa.sold_at, sa.customer_name, sa.total_cents
    FROM commissions c
    JOIN staff s ON s.id = c.staff_id
    JOIN sales sa ON sa.id = c.sale_id
    ORDER BY c.created_at DESC LIMIT 200
  `).all() as Array<{ id: number; sale_id: number; staff_id: number; percent: number; amount_cents: number; paid_at: string | null; staff_name: string; sold_at: string; customer_name: string | null; total_cents: number }>;

  const byStaff = new Map<string, { unpaid: number; paid: number }>();
  for (const r of rows) {
    const cur = byStaff.get(r.staff_name) || { unpaid: 0, paid: 0 };
    if (r.paid_at) cur.paid += r.amount_cents; else cur.unpaid += r.amount_cents;
    byStaff.set(r.staff_name, cur);
  }
  const totalUnpaid = rows.filter((r) => !r.paid_at).reduce((a, b) => a + b.amount_cents, 0);

  return (
    <>
      <PageHeader eyebrow="People" title="Commissions" subtitle="Per-stylist ledger. Set a default % per staff in Settings — every sale tagged with that stylist accrues automatically." />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Stat label="Unpaid" value={dollars(totalUnpaid)} tone={totalUnpaid > 0 ? "warn" : "good"} />
        <Stat label="Stylists" value={byStaff.size} />
        <Stat label="Records (last 200)" value={rows.length} />
      </div>

      <Card title="By stylist" className="mb-6">
        <table className="table">
          <thead><tr><th>Stylist</th><th className="text-right">Unpaid</th><th className="text-right">Paid (life)</th></tr></thead>
          <tbody>
            {[...byStaff.entries()].map(([name, t]) => (
              <tr key={name}>
                <td>{name}</td><td className="text-right">{dollars(t.unpaid)}</td><td className="text-right">{dollars(t.paid)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <Card title="Ledger">
        <table className="table">
          <thead><tr><th>Date</th><th>Stylist</th><th>Sale</th><th>%</th><th className="text-right">Amount</th><th>Status</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td>{shortDate(r.sold_at)}</td>
                <td>{r.staff_name}</td>
                <td>{r.customer_name || "Walk-in"} <span className="text-[11px] text-[var(--ink-mute)]">· {dollars(r.total_cents)}</span></td>
                <td className="mono">{r.percent.toFixed(1)}%</td>
                <td className="text-right">{dollars(r.amount_cents)}</td>
                <td>{r.paid_at ? <Chip tone="good">Paid {shortDate(r.paid_at)}</Chip> : <MarkPaid id={r.id} />}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
