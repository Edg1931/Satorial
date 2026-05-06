import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { dollars, shortDate, shortDateTime } from "@/lib/format";
import { Card, Chip, PageHeader, Stat } from "@/components/ui";
import type { Customer, Measurement, Appointment } from "@/lib/types";
import MeasurementForm from "./measurement-form";
import WishlistManager from "./wishlist";
import ReferralCard from "./referral-card";
import { tierFor } from "@/lib/loyalty";

export const dynamic = "force-dynamic";

const M_FIELDS: Array<{ k: keyof Measurement; label: string }> = [
  { k: "chest", label: "Chest" }, { k: "waist", label: "Waist" }, { k: "hips", label: "Hips" }, { k: "seat", label: "Seat" },
  { k: "shoulder", label: "Shoulder" }, { k: "sleeve_l", label: "Sleeve L" }, { k: "sleeve_r", label: "Sleeve R" },
  { k: "neck", label: "Neck" }, { k: "bicep", label: "Bicep" }, { k: "wrist", label: "Wrist" },
  { k: "jacket_length", label: "Jacket length" }, { k: "back_length", label: "Back length" },
  { k: "inseam", label: "Inseam" }, { k: "outseam", label: "Outseam" }, { k: "thigh", label: "Thigh" }, { k: "knee", label: "Knee" }, { k: "trouser_rise", label: "Rise" },
  { k: "shoe_size", label: "Shoe size" },
];

export default function CustomerDetail({ params }: { params: { id: string } }) {
  const conn = db();
  const customer = conn.prepare("SELECT * FROM customers WHERE id = ?").get(params.id) as Customer | undefined;
  if (!customer) notFound();
  const measurements = conn.prepare("SELECT * FROM measurements WHERE customer_id = ? ORDER BY taken_at DESC").all(customer.id) as Measurement[];
  const appts = conn.prepare("SELECT * FROM appointments WHERE customer_id = ? ORDER BY appointment_date DESC").all(customer.id) as Appointment[];
  const sales = conn.prepare("SELECT id, sold_at, total_cents FROM sales WHERE customer_id = ? ORDER BY sold_at DESC LIMIT 20").all(customer.id) as Array<{ id: number; sold_at: string; total_cents: number }>;
  const lifetimeAll = (conn.prepare("SELECT COALESCE(SUM(total_cents),0) AS t FROM sales WHERE customer_id = ?").get(customer.id) as { t: number }).t;
  const lifetime = lifetimeAll;
  const tier = tierFor(lifetime);
  const wishlist = conn.prepare(`
    SELECT w.*, i.name AS item_name, i.color, i.size, i.quantity FROM wishlist w
    LEFT JOIN items i ON i.id = w.item_id WHERE w.customer_id = ? ORDER BY w.created_at DESC
  `).all(customer.id) as Array<any>;
  const referrals = conn.prepare("SELECT * FROM referrals WHERE referrer_customer_id = ? ORDER BY created_at DESC").all(customer.id) as Array<any>;

  return (
    <>
      <PageHeader
        eyebrow={`Customer · since ${shortDate(customer.created_at)}`}
        title={customer.name}
        subtitle={[customer.email, customer.phone].filter(Boolean).join(" · ") || "No contact details on file"}
        actions={
          <>
            <span className="chip" style={{ borderColor: tier.color, color: tier.color }}>{tier.name}</span>
            <Link href={`/appointments/new?customer_id=${customer.id}`} className="btn btn-primary">+ Appointment</Link>
          </>
        }
      />

      {tier.nextTier && (
        <div className="card p-3 mb-6 text-sm text-[var(--ink-soft)]">
          {dollars(tier.nextTier.remaining)} away from <span className="text-[var(--accent-soft)]">{tier.nextTier.name}</span>.
        </div>
      )}
      {(customer.loyalty_credits_cents ?? 0) > 0 && (
        <div className="card p-3 mb-6 text-sm">
          <span className="chip chip-good">Store credit</span> <span className="ml-2">{dollars(customer.loyalty_credits_cents ?? 0)} available — apply at checkout.</span>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Lifetime spend" value={dollars(lifetime)} />
        <Stat label="Appointments" value={appts.length} />
        <Stat label="Measurement records" value={measurements.length} />
        <Stat label="Last visit" value={sales[0] ? shortDate(sales[0].sold_at) : appts[0] ? shortDate(appts[0].appointment_date) : "—"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Measurement history" className="lg:col-span-2">
          {measurements.length === 0 ? (
            <div className="text-sm text-[var(--ink-mute)]">No measurements yet. Add the first record below.</div>
          ) : (
            <div className="space-y-4">
              {measurements.map((m) => (
                <details key={m.id} className="rounded-lg border border-[var(--line-soft)] p-3" open={m.id === measurements[0].id}>
                  <summary className="flex items-center justify-between cursor-pointer">
                    <div>
                      <div className="text-sm">{shortDateTime(m.taken_at)}</div>
                      <div className="text-[11px] text-[var(--ink-mute)]">By {m.taken_by || "—"}</div>
                    </div>
                    {m.id === measurements[0].id && <Chip tone="accent">latest</Chip>}
                  </summary>
                  <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-6 gap-3 mt-3">
                    {M_FIELDS.map(({ k, label }) => {
                      const v = m[k] as number | null;
                      if (v == null) return null;
                      return (
                        <div key={String(k)} className="rounded-md bg-[var(--bg-elev-2)] border border-[var(--line-soft)] p-2">
                          <div className="text-[10px] uppercase tracking-wider text-[var(--ink-mute)]">{label}</div>
                          <div className="mono text-sm">{v}</div>
                        </div>
                      );
                    })}
                  </div>
                  {m.notes && <div className="text-xs text-[var(--ink-soft)] mt-3">{m.notes}</div>}
                </details>
              ))}
            </div>
          )}
        </Card>

        <Card title="Add measurements">
          <MeasurementForm customerId={customer.id} />
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <ReferralCard customerId={customer.id} customerName={customer.name} existing={referrals} />
        <WishlistManager customerId={customer.id} initial={wishlist} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 mt-6">
        <Card title="Appointments">
          {appts.length === 0 ? (
            <div className="text-sm text-[var(--ink-mute)]">No appointments yet.</div>
          ) : appts.map((a) => (
            <Link key={a.id} href={`/appointments/${a.id}`} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--line-soft)] hover:border-[var(--line)] mb-2">
              <div>
                <div className="text-sm">{a.type.replace("_", " ")}</div>
                <div className="text-[11px] text-[var(--ink-mute)]">{shortDateTime(a.appointment_date)} {a.event_date && `· event ${shortDate(a.event_date)}`}</div>
              </div>
              <Chip tone={a.stage === "ready" ? "good" : a.stage === "scheduled" ? "accent" : "warn"}>{a.stage.replace("_", " ")}</Chip>
            </Link>
          ))}
        </Card>

        <Card title="Recent sales">
          {sales.length === 0 ? (
            <div className="text-sm text-[var(--ink-mute)]">No purchases on record.</div>
          ) : sales.map((s) => (
            <div key={s.id} className="flex items-center justify-between px-3 py-2.5 rounded-lg border border-[var(--line-soft)] mb-2 text-sm">
              <span>{shortDate(s.sold_at)}</span>
              <span className="mono">{dollars(s.total_cents)}</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}
