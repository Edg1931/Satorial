import Link from "next/link";
import { many, one } from "@/lib/db";
import { Card, Empty, PageHeader, Stat } from "@/components/ui";
import { dollars } from "@/lib/format";
import type { CorporateAccount } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function CorporatePage() {
  const accounts = await many<CorporateAccount>("SELECT * FROM corporate_accounts ORDER BY name");
  const totals = await Promise.all(accounts.map(async (a) => {
    const emp = (await one<{ c: number; bal: number }>("SELECT COUNT(*) AS c, COALESCE(SUM(stipend_balance_cents),0) AS bal FROM corporate_employees WHERE account_id = ?", [a.id]))!;
    return { ...a, employees: Number(emp.c), balance: Number(emp.bal) };
  }));
  const totalEmployees = totals.reduce((a, b) => a + b.employees, 0);
  const totalBalance = totals.reduce((a, b) => a + b.balance, 0);

  return (
    <>
      <PageHeader
        eyebrow="B2B"
        title="Corporate Accounts"
        subtitle="Uniform programs, executive wardrobe stipends, recurring batch orders."
        actions={<Link href="/corporate/new" className="btn btn-primary">+ New Account</Link>}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Stat label="Accounts" value={accounts.length} />
        <Stat label="Employees enrolled" value={totalEmployees} />
        <Stat label="Outstanding stipend balance" value={dollars(totalBalance)} />
      </div>

      {accounts.length === 0 ? (
        <Empty title="No corporate accounts yet" hint="Add your first uniform / wardrobe-stipend client." cta="+ New Account" href="/corporate/new" />
      ) : (
        <Card>
          <table className="table">
            <thead><tr><th>Name</th><th>Contact</th><th>Stipend</th><th>Period</th><th>Employees</th><th className="text-right">Balance</th></tr></thead>
            <tbody>
              {totals.map((a) => (
                <tr key={a.id}>
                  <td><Link href={`/corporate/${a.id}`} className="hover:text-[var(--accent-soft)]">{a.name}</Link></td>
                  <td>{a.contact_name || "—"}<div className="text-[11px] text-[var(--ink-mute)]">{a.contact_email || ""}</div></td>
                  <td>{dollars(a.stipend_cents)}</td>
                  <td>{a.stipend_period}</td>
                  <td>{a.employees}</td>
                  <td className="text-right">{dollars(a.balance)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </>
  );
}
