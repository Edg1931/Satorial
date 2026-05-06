import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, PageHeader, Stat } from "@/components/ui";
import { dollars } from "@/lib/format";
import type { CorporateAccount, CorporateEmployee } from "@/lib/types";
import EmployeeManager from "./employees";

export const dynamic = "force-dynamic";

export default function CorporateAccountDetail({ params }: { params: { id: string } }) {
  const conn = db();
  const a = conn.prepare("SELECT * FROM corporate_accounts WHERE id = ?").get(params.id) as CorporateAccount | undefined;
  if (!a) notFound();
  const employees = conn.prepare("SELECT * FROM corporate_employees WHERE account_id = ? ORDER BY name").all(a.id) as CorporateEmployee[];
  const balance = employees.reduce((acc, e) => acc + e.stipend_balance_cents, 0);
  const allocated = a.stipend_cents * employees.length;

  return (
    <>
      <PageHeader eyebrow="Corporate" title={a.name} subtitle={a.contact_name ? `${a.contact_name} · ${a.contact_email || ""}` : "—"} />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Stipend / employee" value={dollars(a.stipend_cents)} hint={a.stipend_period} />
        <Stat label="Employees" value={employees.length} />
        <Stat label="Total allocation" value={dollars(allocated)} />
        <Stat label="Outstanding balance" value={dollars(balance)} tone="warn" />
      </div>

      <Card title="Employees">
        <EmployeeManager accountId={a.id} initial={employees} defaultStipend={a.stipend_cents} />
      </Card>
    </>
  );
}
