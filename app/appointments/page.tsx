import Link from "next/link";
import { db } from "@/lib/db";
import { Card, Chip, Empty, PageHeader } from "@/components/ui";
import { dollars, relativeDate, shortDate, shortDateTime, daysFromNow } from "@/lib/format";
import type { Appointment, GroupOrder } from "@/lib/types";

export const dynamic = "force-dynamic";

type Search = { type?: string; stage?: string; q?: string };

export default function AppointmentsPage({ searchParams }: { searchParams: Search }) {
  const conn = db();
  const where: string[] = [];
  const params: any[] = [];
  if (searchParams.type && searchParams.type !== "all") { where.push("type = ?"); params.push(searchParams.type); }
  if (searchParams.stage && searchParams.stage !== "all") { where.push("stage = ?"); params.push(searchParams.stage); }
  if (searchParams.q) {
    where.push("(customer_name LIKE ? OR garment_description LIKE ? OR fabric LIKE ?)");
    const q = `%${searchParams.q}%`;
    params.push(q, q, q);
  }
  const appts = conn.prepare(
    `SELECT * FROM appointments ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY appointment_date DESC`
  ).all(...params) as Appointment[];

  const groups = conn.prepare("SELECT * FROM group_orders ORDER BY event_date ASC").all() as GroupOrder[];

  const upcoming = appts.filter((a) => {
    const d = daysFromNow(a.appointment_date);
    return a.status !== "cancelled" && d !== null && d >= -1;
  });
  const past = appts.filter((a) => !upcoming.includes(a));

  return (
    <>
      <PageHeader
        eyebrow="Calendar"
        title="Appointments"
        subtitle="Custom suits, rentals, fittings, and consultations — with garment lifecycle tracking."
        actions={
          <>
            <Link href="/appointments/groups/new" className="btn">+ Group order</Link>
            <Link href="/appointments/new" className="btn btn-primary">+ Appointment</Link>
          </>
        }
      />

      <form action="/appointments" className="card p-3 mb-6 flex flex-wrap items-center gap-3">
        <input name="q" defaultValue={searchParams.q || ""} placeholder="Search customer, garment, fabric…" className="input flex-1 min-w-[260px]" />
        <select name="type" defaultValue={searchParams.type || "all"} className="select w-44">
          <option value="all">All types</option>
          <option value="custom_suit">Custom suit</option>
          <option value="rental">Rental</option>
          <option value="fitting">Fitting</option>
          <option value="consultation">Consultation</option>
          <option value="alteration">Alteration</option>
        </select>
        <select name="stage" defaultValue={searchParams.stage || "all"} className="select w-44">
          <option value="all">All stages</option>
          {["scheduled","measured","cut","first_fitting","second_fitting","ready","delivered","cancelled"].map((s) => <option key={s} value={s}>{s.replace("_"," ")}</option>)}
        </select>
        <button className="btn btn-primary">Filter</button>
      </form>

      {groups.length > 0 && (
        <Card title="Group / wedding orders" className="mb-6">
          <div className="grid md:grid-cols-2 gap-3">
            {groups.map((g) => {
              const groupAppts = appts.filter((a) => a.group_order_id === g.id);
              const ready = groupAppts.filter((a) => a.stage === "ready" || a.stage === "delivered").length;
              return (
                <Link key={g.id} href={`/appointments/groups/${g.id}`} className="block card p-4 card-hover">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="serif text-xl">{g.name}</div>
                      <div className="text-xs text-[var(--ink-soft)] mt-1">
                        {g.event_type || "event"} · {g.event_date ? `${shortDate(g.event_date)} (${relativeDate(g.event_date)})` : "no date"}
                      </div>
                    </div>
                    <Chip tone={ready === groupAppts.length ? "good" : "warn"}>{ready}/{groupAppts.length} ready</Chip>
                  </div>
                </Link>
              );
            })}
          </div>
        </Card>
      )}

      {appts.length === 0 ? (
        <Empty title="No appointments yet" cta="+ Appointment" href="/appointments/new" />
      ) : (
        <>
          <Card title="Upcoming" className="mb-6">
            <List items={upcoming} />
          </Card>
          {past.length > 0 && (
            <Card title="Past">
              <List items={past} />
            </Card>
          )}
        </>
      )}
    </>
  );
}

function List({ items }: { items: Appointment[] }) {
  if (items.length === 0) return <div className="text-sm text-[var(--ink-mute)]">Nothing here.</div>;
  return (
    <table className="table">
      <thead><tr><th>When</th><th>Customer</th><th>Type</th><th>Garment</th><th>Stage</th><th>Event</th><th className="text-right">Balance</th></tr></thead>
      <tbody>
        {items.map((a) => (
          <tr key={a.id}>
            <td>
              <Link href={`/appointments/${a.id}`} className="hover:text-[var(--accent-soft)]">{shortDateTime(a.appointment_date)}</Link>
              <div className="text-[11px] text-[var(--ink-mute)]">{relativeDate(a.appointment_date)}</div>
            </td>
            <td>{a.customer_name}</td>
            <td>{a.type.replace("_", " ")}</td>
            <td className="max-w-[280px] truncate" title={a.garment_description || ""}>{a.garment_description || "—"}</td>
            <td><Chip tone={a.stage === "ready" || a.stage === "delivered" ? "good" : a.stage === "cancelled" ? "bad" : a.stage === "scheduled" ? "accent" : "warn"}>{a.stage.replace("_", " ")}</Chip></td>
            <td>{a.event_date ? shortDate(a.event_date) : "—"}</td>
            <td className="text-right">{dollars(a.balance_cents)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
