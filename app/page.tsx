import Link from "next/link";
import { db } from "@/lib/db";
import { dollars, relativeDate, shortDate } from "@/lib/format";
import { Card, Chip, PageHeader, Stat } from "@/components/ui";

export const dynamic = "force-dynamic";

function dashboardData() {
  const conn = db();

  const totals = conn.prepare(`SELECT COUNT(*) as skus, COALESCE(SUM(quantity),0) as units, COALESCE(SUM(quantity*cost_cents),0) as inv_value FROM items`).get() as { skus: number; units: number; inv_value: number };

  const last30 = conn.prepare(`
    SELECT COALESCE(SUM(s.total_cents),0) AS rev,
           COUNT(DISTINCT s.id) AS orders,
           COALESCE(SUM(si.quantity),0) AS units
    FROM sales s LEFT JOIN sale_items si ON si.sale_id = s.id
    WHERE s.sold_at >= datetime('now','-30 days')
  `).get() as { rev: number; orders: number; units: number };

  const prev30 = conn.prepare(`
    SELECT COALESCE(SUM(total_cents),0) AS rev FROM sales
    WHERE sold_at >= datetime('now','-60 days') AND sold_at < datetime('now','-30 days')
  `).get() as { rev: number };

  const cogs = conn.prepare(`
    SELECT COALESCE(SUM(si.quantity*i.cost_cents),0) AS cogs
    FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN items i ON i.id=si.item_id
    WHERE s.sold_at >= datetime('now','-30 days')
  `).get() as { cogs: number };

  const lowStock = conn.prepare(`
    SELECT id, name, color, size, quantity, reorder_point
    FROM items WHERE quantity <= reorder_point ORDER BY (reorder_point-quantity) DESC LIMIT 6
  `).all() as Array<{ id: number; name: string; color: string | null; size: string | null; quantity: number; reorder_point: number }>;

  const upcoming = conn.prepare(`
    SELECT id, type, customer_name, appointment_date, event_date, stage
    FROM appointments WHERE status='open' AND appointment_date >= datetime('now','-1 days')
    ORDER BY appointment_date ASC LIMIT 6
  `).all() as Array<{ id: number; type: string; customer_name: string; appointment_date: string; event_date: string | null; stage: string }>;

  const dueSoon = conn.prepare(`
    SELECT id, customer_name, event_date, stage
    FROM appointments
    WHERE status='open'
      AND event_date IS NOT NULL
      AND date(event_date) BETWEEN date('now') AND date('now','+14 days')
      AND stage NOT IN ('ready','delivered','cancelled')
    ORDER BY event_date ASC
  `).all() as Array<{ id: number; customer_name: string; event_date: string; stage: string }>;

  const lateRentals = conn.prepare(`
    SELECT id, customer_name, rental_return_date
    FROM appointments
    WHERE type='rental' AND status='open'
      AND rental_return_date IS NOT NULL
      AND date(rental_return_date) < date('now')
      AND rental_state IN ('out','late')
    ORDER BY rental_return_date ASC
  `).all() as Array<{ id: number; customer_name: string; rental_return_date: string }>;

  const topSizes = conn.prepare(`
    SELECT category_at_sale AS category, COALESCE(size_at_sale,'—') AS size, SUM(quantity) AS units
    FROM sale_items si JOIN sales s ON s.id=si.sale_id
    WHERE s.sold_at >= datetime('now','-90 days')
    GROUP BY category_at_sale, size_at_sale
    ORDER BY units DESC LIMIT 6
  `).all() as Array<{ category: string; size: string; units: number }>;

  const margin = last30.rev > 0 ? (last30.rev - cogs.cogs) / last30.rev : 0;
  const trend = prev30.rev > 0 ? ((last30.rev - prev30.rev) / prev30.rev) * 100 : null;

  return { totals, last30, cogs, margin, trend, lowStock, upcoming, dueSoon, lateRentals, topSizes };
}

export default function DashboardPage() {
  const d = dashboardData();
  return (
    <>
      <PageHeader
        eyebrow="Today"
        title="Good day, Owner."
        subtitle="Here's the floor at a glance — sales pace, stock to act on, and what's on the calendar."
        actions={<Link href="/ai" className="btn btn-primary">✦ Ask the AI Partner</Link>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <Stat
          label="Revenue · 30d"
          value={dollars(d.last30.rev)}
          delta={d.trend === null ? undefined : `${d.trend >= 0 ? "▲" : "▼"} ${Math.abs(d.trend).toFixed(1)}% vs prior`}
          tone={d.trend === null ? "default" : d.trend >= 0 ? "good" : "bad"}
        />
        <Stat label="Gross Margin · 30d" value={`${(d.margin * 100).toFixed(1)}%`} hint={`COGS ${dollars(d.cogs.cogs)}`} />
        <Stat label="Inventory Value" value={dollars(d.totals.inv_value)} hint={`${d.totals.units} units · ${d.totals.skus} SKUs`} />
        <Stat
          label="At-Risk / Late"
          value={d.dueSoon.length + d.lateRentals.length}
          hint={d.lateRentals.length ? `${d.lateRentals.length} rental(s) past due` : d.dueSoon.length ? "events in next 14d, not ready" : "all clear"}
          tone={d.dueSoon.length > 0 || d.lateRentals.length > 0 ? "warn" : "good"}
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Upcoming Appointments" action={<Link href="/appointments" className="text-sm text-[var(--accent-soft)]">All →</Link>} className="lg:col-span-2">
          {d.upcoming.length === 0 ? (
            <div className="text-sm text-[var(--ink-mute)]">Nothing scheduled.</div>
          ) : (
            <div className="space-y-2">
              {d.upcoming.map((a) => (
                <Link key={a.id} href={`/appointments/${a.id}`} className="flex items-center justify-between px-3 py-3 rounded-lg border border-[var(--line-soft)] hover:border-[var(--line)] card-hover">
                  <div>
                    <div className="font-medium">{a.customer_name}</div>
                    <div className="text-xs text-[var(--ink-soft)] mt-0.5">
                      {a.type.replace("_", " ")} · {relativeDate(a.appointment_date)}
                      {a.event_date && <> · event {shortDate(a.event_date)}</>}
                    </div>
                  </div>
                  <Chip tone={a.stage === "ready" ? "good" : a.stage === "scheduled" ? "accent" : "warn"}>{a.stage.replace("_", " ")}</Chip>
                </Link>
              ))}
            </div>
          )}
        </Card>

        <Card title="Reorder Now" action={<Link href="/inventory?filter=low" className="text-sm text-[var(--accent-soft)]">All →</Link>}>
          {d.lowStock.length === 0 ? (
            <div className="text-sm text-[var(--ink-mute)]">Stock levels are healthy.</div>
          ) : (
            <div className="space-y-2">
              {d.lowStock.map((i) => (
                <Link key={i.id} href={`/inventory/${i.id}`} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--line-soft)] hover:border-[var(--line)]">
                  <div>
                    <div className="text-sm">{i.name}</div>
                    <div className="text-[11px] text-[var(--ink-mute)]">{[i.color, i.size].filter(Boolean).join(" · ")}</div>
                  </div>
                  <Chip tone={i.quantity === 0 ? "bad" : "warn"}>{i.quantity} / {i.reorder_point}</Chip>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mt-6">
        <Card title="Top Sizes · 90d" className="lg:col-span-2">
          {d.topSizes.length === 0 ? (
            <div className="text-sm text-[var(--ink-mute)]">Not enough data yet.</div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {d.topSizes.map((t, i) => (
                <div key={i} className="rounded-lg border border-[var(--line-soft)] p-3">
                  <div className="text-[11px] uppercase tracking-wider text-[var(--ink-mute)]">{t.category}</div>
                  <div className="serif text-2xl mt-1">{t.size}</div>
                  <div className="text-xs text-[var(--ink-soft)] mt-1">{t.units} units sold</div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card title="Action queue">
          {d.dueSoon.length === 0 && d.lateRentals.length === 0 ? (
            <div className="text-sm text-[var(--ink-mute)]">All clear.</div>
          ) : (
            <div className="space-y-2">
              {d.lateRentals.map((a) => (
                <Link key={`r-${a.id}`} href={`/appointments/${a.id}`} className="block px-3 py-2 rounded-lg border border-[var(--bad)]/40 hover:border-[var(--bad)]">
                  <div className="flex items-center justify-between">
                    <div className="text-sm">{a.customer_name}</div>
                    <Chip tone="bad">Late rental</Chip>
                  </div>
                  <div className="text-[11px] text-[var(--ink-mute)]">Return was {relativeDate(a.rental_return_date)}</div>
                </Link>
              ))}
              {d.dueSoon.map((a) => (
                <Link key={`d-${a.id}`} href={`/appointments/${a.id}`} className="block px-3 py-2 rounded-lg border border-[var(--line-soft)] hover:border-[var(--line)]">
                  <div className="text-sm">{a.customer_name}</div>
                  <div className="text-[11px] text-[var(--ink-mute)]">Event {relativeDate(a.event_date)} · stage {a.stage.replace("_", " ")}</div>
                </Link>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
