import Link from "next/link";
import { notFound } from "next/navigation";
import { many, one } from "@/lib/db";
import { Card, Chip, PageHeader, Stat } from "@/components/ui";
import { dollars, relativeDate, shortDate, shortDateTime } from "@/lib/format";
import type { Appointment, GroupOrder } from "@/lib/types";
import PortalLink from "./portal-link";

export const dynamic = "force-dynamic";

export default async function GroupDetail({ params }: { params: { id: string } }) {
  const g = await one<GroupOrder>("SELECT * FROM group_orders WHERE id = ?", [params.id]);
  if (!g) notFound();
  const members = await many<Appointment>("SELECT * FROM appointments WHERE group_order_id = ? ORDER BY customer_name", [g.id]);
  const portal = await one<{ token: string }>("SELECT token FROM wedding_portals WHERE group_order_id = ?", [g.id]);
  const ready = members.filter((m) => m.stage === "ready" || m.stage === "delivered").length;
  const total = members.reduce((a, b) => a + Number(b.total_cents), 0);
  const balance = members.reduce((a, b) => a + Number(b.balance_cents), 0);

  return (
    <>
      <PageHeader
        eyebrow={`Group order · ${g.event_type || "event"}`}
        title={g.name}
        subtitle={g.event_date ? `Event ${shortDate(g.event_date)} (${relativeDate(g.event_date)})` : "No event date set"}
        actions={<Link className="btn btn-primary" href={`/appointments/new?group_id=${g.id}&type=rental`}>+ Add member</Link>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Members" value={members.length} />
        <Stat label="Ready" value={`${ready} / ${members.length}`} tone={ready === members.length ? "good" : "warn"} />
        <Stat label="Group total" value={dollars(total)} />
        <Stat label="Outstanding balance" value={dollars(balance)} tone={balance > 0 ? "warn" : "good"} />
      </div>

      <Card title="Self-service portal" className="mb-6">
        <PortalLink groupId={g.id} token={portal?.token || null} />
      </Card>

      <Card title="Members">
        {members.length === 0 ? (
          <div className="text-sm text-[var(--ink-mute)]">Add the first member to get started.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Name</th><th>Type</th><th>Garment</th><th>Pickup</th><th>Return</th><th>Stage</th><th className="text-right">Balance</th></tr></thead>
            <tbody>
              {members.map((m) => (
                <tr key={m.id}>
                  <td><Link href={`/appointments/${m.id}`} className="hover:text-[var(--accent-soft)]">{m.customer_name}</Link></td>
                  <td>{m.type.replace("_", " ")}</td>
                  <td className="max-w-[260px] truncate" title={m.garment_description || ""}>{m.garment_description || "—"}</td>
                  <td>{m.rental_pickup_date ? shortDate(m.rental_pickup_date) : "—"}</td>
                  <td>{m.rental_return_date ? shortDate(m.rental_return_date) : "—"}</td>
                  <td><Chip tone={m.stage === "ready" || m.stage === "delivered" ? "good" : m.stage === "scheduled" ? "accent" : "warn"}>{m.stage.replace("_", " ")}</Chip></td>
                  <td className="text-right">{dollars(m.balance_cents)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
