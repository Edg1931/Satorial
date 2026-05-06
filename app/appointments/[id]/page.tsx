import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { Card, Chip, PageHeader, Stat } from "@/components/ui";
import { dollars, relativeDate, shortDate, shortDateTime, daysFromNow } from "@/lib/format";
import type { Appointment, GroupOrder } from "@/lib/types";
import StageControl from "./stage-control";
import RentalControl from "./rental-control";

export const dynamic = "force-dynamic";

const STAGES_FLOW = ["scheduled", "measured", "cut", "first_fitting", "second_fitting", "ready", "delivered"];

export default function AppointmentDetail({ params }: { params: { id: string } }) {
  const conn = db();
  const a = conn.prepare("SELECT * FROM appointments WHERE id = ?").get(params.id) as Appointment | undefined;
  if (!a) notFound();
  const group = a.group_order_id ? conn.prepare("SELECT * FROM group_orders WHERE id = ?").get(a.group_order_id) as GroupOrder | undefined : undefined;

  const stageIdx = STAGES_FLOW.indexOf(a.stage);

  return (
    <>
      <PageHeader
        eyebrow={`${a.type.replace("_", " ")} · ${a.status}`}
        title={a.customer_name}
        subtitle={a.garment_description || "—"}
        actions={<Link href="/appointments" className="btn">← All appointments</Link>}
      />

      {group && (
        <div className="card p-3 mb-6 flex items-center justify-between">
          <div className="text-sm">Part of <Link href={`/appointments/groups/${group.id}`} className="text-[var(--accent-soft)]">{group.name}</Link>{group.event_date ? ` · event ${shortDate(group.event_date)}` : ""}</div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Appointment" value={shortDateTime(a.appointment_date)} hint={relativeDate(a.appointment_date)} />
        <Stat label="Event" value={a.event_date ? shortDate(a.event_date) : "—"} hint={a.event_date ? relativeDate(a.event_date) : ""} />
        <Stat label="Total" value={dollars(a.total_cents)} hint={`Deposit ${dollars(a.deposit_cents)}`} />
        <Stat
          label="Balance"
          value={dollars(a.balance_cents)}
          tone={a.balance_cents > 0 ? "warn" : "good"}
        />
      </div>

      {a.type === "rental" && (
        <Card title="Rental lifecycle" className="mb-6">
          <RentalControl id={a.id} state={a.rental_state} returnDate={a.rental_return_date} />
        </Card>
      )}

      <Card title="Workflow stages" className="mb-6">
        <div className="flex items-center gap-2 overflow-x-auto scrollbar pb-2">
          {STAGES_FLOW.map((s, i) => {
            const done = i < stageIdx;
            const cur = i === stageIdx;
            return (
              <div key={s} className="flex items-center gap-2 shrink-0">
                <div className={`w-9 h-9 rounded-full grid place-items-center text-xs font-semibold border ${cur ? "bg-[var(--accent)] text-[#1a1408] border-[var(--accent)]" : done ? "bg-[var(--bg-elev-2)] border-[var(--good)] text-[var(--good)]" : "bg-[var(--bg)] border-[var(--line-soft)] text-[var(--ink-mute)]"}`}>{i + 1}</div>
                <div className={`text-xs uppercase tracking-wider ${cur ? "text-[var(--ink)]" : done ? "text-[var(--ink-soft)]" : "text-[var(--ink-mute)]"}`}>{s.replace("_", " ")}</div>
                {i < STAGES_FLOW.length - 1 && <div className={`w-8 h-px ${i < stageIdx ? "bg-[var(--good)]" : "bg-[var(--line-soft)]"}`} />}
              </div>
            );
          })}
        </div>
        <div className="mt-4">
          <StageControl id={a.id} stage={a.stage} />
        </div>
      </Card>

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="Schedule & dates">
          <div className="space-y-2.5 text-sm">
            <Row k="Appointment" v={`${shortDateTime(a.appointment_date)} (${relativeDate(a.appointment_date)})`} />
            {a.event_date && <Row k="Event" v={`${shortDate(a.event_date)} (${relativeDate(a.event_date)})`} />}
            {a.garment_expected_date && <Row k="Garment expected" v={`${shortDate(a.garment_expected_date)} (${relativeDate(a.garment_expected_date)})`} />}
            {a.garment_delivered_date && <Row k="Garment delivered" v={shortDate(a.garment_delivered_date)} />}
            {a.rental_pickup_date && <Row k="Rental pickup" v={shortDate(a.rental_pickup_date)} />}
            {a.rental_return_date && <Row k="Rental return" v={shortDate(a.rental_return_date)} />}
          </div>
        </Card>
        <Card title="Customer & garment">
          <div className="space-y-2.5 text-sm">
            <Row k="Customer" v={a.customer_id ? <Link className="hover:text-[var(--accent-soft)]" href={`/customers/${a.customer_id}`}>{a.customer_name}</Link> : a.customer_name} />
            <Row k="Phone" v={a.customer_phone || "—"} />
            <Row k="Email" v={a.customer_email || "—"} />
            <Row k="Type" v={a.type.replace("_", " ")} />
            <Row k="Garment" v={a.garment_description || "—"} />
            <Row k="Fabric" v={a.fabric || "—"} />
            <Row k="Style notes" v={a.style_notes || "—"} />
            <Row k="Internal notes" v={a.notes || "—"} />
          </div>
        </Card>
      </div>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return <div className="flex items-start justify-between gap-3"><span className="text-[var(--ink-mute)] shrink-0">{k}</span><span className="text-right">{v}</span></div>;
}
