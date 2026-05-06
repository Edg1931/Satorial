import Link from "next/link";
import { db } from "@/lib/db";
import { Card, PageHeader, Stat } from "@/components/ui";
import { dollars, shortDate } from "@/lib/format";
import FinanceCharts from "./charts";
import CashFlowChart from "./cashflow";

export const dynamic = "force-dynamic";

function loadFinance() {
  const conn = db();

  const rev = conn.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN sold_at >= datetime('now','-30 days') THEN total_cents END),0) AS r30,
      COALESCE(SUM(CASE WHEN sold_at >= datetime('now','-60 days') AND sold_at < datetime('now','-30 days') THEN total_cents END),0) AS rPrev30,
      COALESCE(SUM(CASE WHEN sold_at >= datetime('now','-365 days') THEN total_cents END),0) AS r365,
      COALESCE(SUM(total_cents),0) AS rAll
    FROM sales
  `).get() as { r30: number; rPrev30: number; r365: number; rAll: number };

  const cogs = conn.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN s.sold_at >= datetime('now','-30 days') THEN si.quantity*i.cost_cents END),0) AS c30,
      COALESCE(SUM(CASE WHEN s.sold_at >= datetime('now','-365 days') THEN si.quantity*i.cost_cents END),0) AS c365
    FROM sale_items si JOIN sales s ON s.id=si.sale_id JOIN items i ON i.id=si.item_id
  `).get() as { c30: number; c365: number };

  const expenses = conn.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN occurred_at >= datetime('now','-30 days') THEN amount_cents END),0) AS e30,
      COALESCE(SUM(CASE WHEN occurred_at >= datetime('now','-365 days') THEN amount_cents END),0) AS e365
    FROM expenses
  `).get() as { e30: number; e365: number };

  const expenseCats = conn.prepare(`
    SELECT category, SUM(amount_cents) AS total FROM expenses
    WHERE occurred_at >= datetime('now','-90 days')
    GROUP BY category ORDER BY total DESC
  `).all() as Array<{ category: string; total: number }>;

  const inventory = conn.prepare(`
    SELECT COALESCE(SUM(quantity*cost_cents),0) AS at_cost, COALESCE(SUM(quantity*price_cents),0) AS at_retail FROM items
  `).get() as { at_cost: number; at_retail: number };

  const purchaseOrders = conn.prepare(`
    SELECT COALESCE(SUM(total_cents),0) AS open_total FROM purchase_orders WHERE status IN ('open','partial')
  `).get() as { open_total: number };

  const deferred = conn.prepare(`
    SELECT
      COALESCE(SUM(CASE WHEN type='custom_suit' THEN balance_cents END),0) AS suit_balance,
      COALESCE(SUM(CASE WHEN type='custom_suit' THEN total_cents END),0) AS suit_total,
      COALESCE(SUM(CASE WHEN type='custom_suit' THEN deposit_cents END),0) AS suit_deposit,
      COALESCE(SUM(CASE WHEN type='rental' THEN balance_cents END),0) AS rental_balance,
      COALESCE(SUM(CASE WHEN type='rental' THEN total_cents END),0) AS rental_total,
      COALESCE(SUM(CASE WHEN type='rental' THEN deposit_cents END),0) AS rental_deposit
    FROM appointments WHERE status = 'open'
  `).get() as { suit_balance: number; suit_total: number; suit_deposit: number; rental_balance: number; rental_total: number; rental_deposit: number };

  const dailyRev = conn.prepare(`
    SELECT date(sold_at) AS d, SUM(total_cents) AS rev
    FROM sales WHERE sold_at >= datetime('now','-89 days')
    GROUP BY date(sold_at) ORDER BY d ASC
  `).all() as Array<{ d: string; rev: number }>;

  const upcomingDeposits = conn.prepare(`
    SELECT id, customer_name, type, event_date, balance_cents
    FROM appointments
    WHERE status='open' AND balance_cents > 0
    ORDER BY COALESCE(event_date, appointment_date) ASC LIMIT 12
  `).all() as Array<{ id: number; customer_name: string; type: string; event_date: string | null; balance_cents: number }>;

  const recentExpenses = conn.prepare(`SELECT * FROM expenses ORDER BY occurred_at DESC LIMIT 8`).all() as Array<{ id: number; occurred_at: string; category: string; amount_cents: number; vendor: string | null }>;
  const openPOs = conn.prepare(`SELECT * FROM purchase_orders WHERE status IN ('open','partial') ORDER BY ordered_at DESC LIMIT 8`).all() as Array<{ id: number; supplier: string; ordered_at: string; expected_at: string | null; total_cents: number; status: string }>;

  const inflowAppt = conn.prepare(`
    SELECT date(COALESCE(event_date, appointment_date)) AS d, SUM(balance_cents) AS amt
    FROM appointments
    WHERE status = 'open' AND balance_cents > 0
      AND date(COALESCE(event_date, appointment_date)) BETWEEN date('now') AND date('now','+90 days')
    GROUP BY d ORDER BY d
  `).all() as Array<{ d: string; amt: number }>;

  const outflowPO = conn.prepare(`
    SELECT date(COALESCE(expected_at, ordered_at)) AS d, SUM(total_cents) AS amt
    FROM purchase_orders
    WHERE status IN ('open','partial')
      AND date(COALESCE(expected_at, ordered_at)) BETWEEN date('now') AND date('now','+90 days')
    GROUP BY d ORDER BY d
  `).all() as Array<{ d: string; amt: number }>;

  const dailyExpenseAvg = (conn.prepare(`SELECT COALESCE(SUM(amount_cents),0)/90.0 AS avg FROM expenses WHERE occurred_at >= datetime('now','-90 days')`).get() as { avg: number }).avg;
  const cashflow = buildCashflow(inflowAppt, outflowPO, dailyExpenseAvg);

  const gp30 = rev.r30 - cogs.c30;
  const op30 = gp30 - expenses.e30;
  const margin30 = rev.r30 > 0 ? gp30 / rev.r30 : 0;
  const trend = rev.rPrev30 > 0 ? ((rev.r30 - rev.rPrev30) / rev.rPrev30) * 100 : null;

  return { rev, cogs, expenses, expenseCats, inventory, purchaseOrders, deferred, dailyRev, upcomingDeposits, recentExpenses, openPOs, cashflow, gp30, op30, margin30, trend };
}

function buildCashflow(inflows: Array<{ d: string; amt: number }>, outflows: Array<{ d: string; amt: number }>, dailyExpense: number) {
  const inMap = new Map(inflows.map((x) => [x.d, x.amt]));
  const outMap = new Map(outflows.map((x) => [x.d, x.amt]));
  const days: Array<{ d: string; in_: number; out: number; net: number }> = [];
  for (let i = 0; i <= 90; i++) {
    const dt = new Date();
    dt.setDate(dt.getDate() + i);
    const d = dt.toISOString().slice(0, 10);
    const in_ = inMap.get(d) || 0;
    const out = (outMap.get(d) || 0) + dailyExpense;
    days.push({ d, in_, out, net: in_ - out });
  }
  return days;
}

export default function FinancePage() {
  const f = loadFinance();
  const futureBookedRev = f.deferred.suit_total + f.deferred.rental_total;
  const futureRevToCollect = f.deferred.suit_balance + f.deferred.rental_balance;

  return (
    <>
      <PageHeader
        eyebrow="Finance"
        title="The Books"
        subtitle="Trailing P&L, deferred revenue from booked custom orders & rentals, and what to collect next."
        actions={
          <>
            <Link href="/finance/expenses/new" className="btn">+ Expense</Link>
            <Link href="/finance/po/new" className="btn btn-primary">+ Purchase Order</Link>
          </>
        }
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Revenue · 30d" value={dollars(f.rev.r30)} delta={f.trend === null ? undefined : `${f.trend >= 0 ? "▲" : "▼"} ${Math.abs(f.trend).toFixed(1)}% vs prior`} tone={f.trend === null ? "default" : f.trend >= 0 ? "good" : "bad"} />
        <Stat label="Gross profit · 30d" value={dollars(f.gp30)} hint={`${(f.margin30 * 100).toFixed(1)}% margin`} />
        <Stat label="Operating profit · 30d" value={dollars(f.op30)} hint={`Expenses ${dollars(f.expenses.e30)}`} tone={f.op30 >= 0 ? "good" : "bad"} />
        <Stat label="Inventory at cost" value={dollars(f.inventory.at_cost)} hint={`${dollars(f.inventory.at_retail)} at retail`} />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Booked future revenue" value={dollars(futureBookedRev)} hint={`${dollars(f.deferred.suit_total)} suits · ${dollars(f.deferred.rental_total)} rentals`} tone="good" />
        <Stat label="Deposits collected" value={dollars(f.deferred.suit_deposit + f.deferred.rental_deposit)} />
        <Stat label="Future to collect" value={dollars(futureRevToCollect)} tone="warn" />
        <Stat label="Open purchase orders" value={dollars(f.purchaseOrders.open_total)} />
      </div>

      <FinanceCharts daily={f.dailyRev} categories={f.expenseCats} />

      <Card title="90-day cash flow forecast" className="mt-6">
        <div className="text-xs text-[var(--ink-mute)] mb-3">Inflows = balances due on booked appointments by event date. Outflows = expected POs + 90-day average expenses.</div>
        <CashFlowChart data={f.cashflow} />
      </Card>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card title="Balances to collect">
          {f.upcomingDeposits.length === 0 ? (
            <div className="text-sm text-[var(--ink-mute)]">All booked orders are paid in full.</div>
          ) : (
            <table className="table">
              <thead><tr><th>Customer</th><th>Type</th><th>Event</th><th className="text-right">Balance</th></tr></thead>
              <tbody>
                {f.upcomingDeposits.map((d) => (
                  <tr key={d.id}>
                    <td><Link href={`/appointments/${d.id}`} className="hover:text-[var(--accent-soft)]">{d.customer_name}</Link></td>
                    <td>{d.type.replace("_", " ")}</td>
                    <td>{d.event_date ? shortDate(d.event_date) : "—"}</td>
                    <td className="text-right">{dollars(d.balance_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        <Card title="Open purchase orders">
          {f.openPOs.length === 0 ? (
            <div className="text-sm text-[var(--ink-mute)]">No open purchase orders.</div>
          ) : (
            <table className="table">
              <thead><tr><th>Supplier</th><th>Ordered</th><th>Expected</th><th className="text-right">Total</th></tr></thead>
              <tbody>
                {f.openPOs.map((p) => (
                  <tr key={p.id}>
                    <td>{p.supplier}</td><td>{shortDate(p.ordered_at)}</td><td>{p.expected_at ? shortDate(p.expected_at) : "—"}</td>
                    <td className="text-right">{dollars(p.total_cents)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>

      <Card title="Recent expenses" className="mt-6">
        {f.recentExpenses.length === 0 ? (
          <div className="text-sm text-[var(--ink-mute)]">No expenses logged yet.</div>
        ) : (
          <table className="table">
            <thead><tr><th>When</th><th>Category</th><th>Vendor</th><th className="text-right">Amount</th></tr></thead>
            <tbody>
              {f.recentExpenses.map((e) => (
                <tr key={e.id}>
                  <td>{shortDate(e.occurred_at)}</td><td>{e.category}</td><td>{e.vendor || "—"}</td>
                  <td className="text-right">{dollars(e.amount_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
