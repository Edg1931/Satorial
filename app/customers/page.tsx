import Link from "next/link";
import { db } from "@/lib/db";
import { Card, Empty, PageHeader } from "@/components/ui";
import { dollars, shortDate } from "@/lib/format";
import type { Customer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function CustomersPage({ searchParams }: { searchParams: { q?: string } }) {
  const conn = db();
  const q = searchParams.q?.trim();
  const customers = conn.prepare(
    q
      ? `SELECT * FROM customers WHERE name LIKE ? OR email LIKE ? OR phone LIKE ? ORDER BY name`
      : `SELECT * FROM customers ORDER BY name`
  ).all(...(q ? [`%${q}%`, `%${q}%`, `%${q}%`] : [])) as Customer[];

  const stats = conn.prepare(`
    SELECT c.id,
      (SELECT COUNT(*) FROM appointments WHERE customer_id=c.id) AS appts,
      (SELECT COUNT(*) FROM measurements WHERE customer_id=c.id) AS meas,
      (SELECT COALESCE(SUM(s.total_cents),0) FROM sales s WHERE s.customer_id=c.id) AS spend
    FROM customers c
  `).all() as Array<{ id: number; appts: number; meas: number; spend: number }>;
  const map = new Map(stats.map((s) => [s.id, s]));

  return (
    <>
      <PageHeader
        eyebrow="Customers"
        title="The Book"
        subtitle="Profiles, lifetime spend, measurement histories. Click a name to open the dossier."
        actions={<Link href="/customers/new" className="btn btn-primary">+ Add Customer</Link>}
      />

      <form action="/customers" className="card p-3 mb-6">
        <input name="q" defaultValue={q || ""} placeholder="Search name, email, phone…" className="input" />
      </form>

      {customers.length === 0 ? (
        <Empty title="No customers yet" cta="+ Add Customer" href="/customers/new" />
      ) : (
        <Card>
          <table className="table">
            <thead><tr><th>Name</th><th>Email</th><th>Phone</th><th>Appts</th><th>Measurements</th><th className="text-right">Lifetime spend</th></tr></thead>
            <tbody>
              {customers.map((c) => {
                const s = map.get(c.id);
                return (
                  <tr key={c.id}>
                    <td><Link href={`/customers/${c.id}`} className="font-medium hover:text-[var(--accent-soft)]">{c.name}</Link><div className="text-[11px] text-[var(--ink-mute)]">Since {shortDate(c.created_at)}</div></td>
                    <td>{c.email || "—"}</td>
                    <td>{c.phone || "—"}</td>
                    <td>{s?.appts ?? 0}</td>
                    <td>{s?.meas ?? 0}</td>
                    <td className="text-right">{dollars(s?.spend ?? 0)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
