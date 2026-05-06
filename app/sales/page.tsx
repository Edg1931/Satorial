import Link from "next/link";
import { many, one } from "@/lib/db";
import { dollars, shortDateTime } from "@/lib/format";
import { Card, PageHeader, Stat } from "@/components/ui";
import SalesCharts from "./charts";

export const dynamic = "force-dynamic";

async function load() {
  const recent = await many<{ id: number; sold_at: string; customer_name: string | null; total_cents: number; payment_method: string | null; line_count: number }>(`
    SELECT s.id, s.sold_at, s.customer_name, s.total_cents, s.payment_method,
           (SELECT COUNT(*) FROM sale_items si WHERE si.sale_id = s.id) AS line_count
    FROM sales s ORDER BY s.sold_at DESC LIMIT 25`);

  const totalsRow = (await one<{ rev30: number; orders30: number; rev_all: number; orders_all: number }>(`
    SELECT
      COALESCE(SUM(CASE WHEN s.sold_at >= datetime('now','-30 days') THEN s.total_cents END),0) AS rev30,
      COUNT(CASE WHEN s.sold_at >= datetime('now','-30 days') THEN 1 END) AS orders30,
      COALESCE(SUM(s.total_cents),0) AS rev_all,
      COUNT(*) AS orders_all
    FROM sales s`))!;
  const totals = { rev30: Number(totalsRow.rev30), orders30: Number(totalsRow.orders30), rev_all: Number(totalsRow.rev_all), orders_all: Number(totalsRow.orders_all) };

  const byDay = await many<{ d: string; rev: number; orders: number }>(`
    SELECT date(s.sold_at) AS d, SUM(s.total_cents) AS rev, COUNT(*) AS orders
    FROM sales s WHERE s.sold_at >= datetime('now','-29 days')
    GROUP BY date(s.sold_at) ORDER BY d ASC`);

  const bySize = await many<{ category: string; size: string; units: number; revenue: number }>(`
    SELECT category_at_sale AS category, COALESCE(size_at_sale,'—') AS size, SUM(quantity) AS units, SUM(quantity*unit_price_cents) AS revenue
    FROM sale_items si JOIN sales s ON s.id=si.sale_id
    WHERE s.sold_at >= datetime('now','-90 days')
    GROUP BY category_at_sale, size_at_sale
    ORDER BY units DESC LIMIT 15`);

  const byCategory = await many<{ category: string; units: number; revenue: number }>(`
    SELECT category_at_sale AS category, SUM(quantity) AS units, SUM(quantity*unit_price_cents) AS revenue
    FROM sale_items si JOIN sales s ON s.id=si.sale_id
    WHERE s.sold_at >= datetime('now','-90 days')
    GROUP BY category_at_sale ORDER BY revenue DESC`);

  const aov = totals.orders30 > 0 ? totals.rev30 / totals.orders30 : 0;
  return {
    recent: recent.map((r) => ({ ...r, total_cents: Number(r.total_cents), line_count: Number(r.line_count) })),
    totals,
    byDay: byDay.map((d) => ({ ...d, rev: Number(d.rev), orders: Number(d.orders) })),
    bySize: bySize.map((d) => ({ ...d, units: Number(d.units), revenue: Number(d.revenue) })),
    byCategory: byCategory.map((d) => ({ ...d, units: Number(d.units), revenue: Number(d.revenue) })),
    aov,
  };
}

export default async function SalesPage() {
  const d = await load();
  return (
    <>
      <PageHeader
        eyebrow="Sales"
        title="What's selling"
        subtitle="Trend, top sizes by category, and the live order log."
        actions={<Link href="/sales/new" className="btn btn-primary">+ New Sale</Link>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Revenue · 30d" value={dollars(d.totals.rev30)} />
        <Stat label="Orders · 30d" value={d.totals.orders30} />
        <Stat label="AOV · 30d" value={dollars(d.aov)} />
        <Stat label="Revenue · all-time" value={dollars(d.totals.rev_all)} />
      </div>

      <SalesCharts byDay={d.byDay} byCategory={d.byCategory} bySize={d.bySize} />

      <Card title="Recent orders" className="mt-6">
        <table className="table">
          <thead><tr><th>When</th><th>Customer</th><th>Items</th><th>Method</th><th className="text-right">Total</th></tr></thead>
          <tbody>
            {d.recent.map((s) => (
              <tr key={s.id}>
                <td>{shortDateTime(s.sold_at)}</td>
                <td>{s.customer_name || "Walk-in"}</td>
                <td>{s.line_count}</td>
                <td>{s.payment_method || "—"}</td>
                <td className="text-right">{dollars(s.total_cents)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </>
  );
}
