import Link from "next/link";
import { db } from "@/lib/db";
import { Card, Chip, PageHeader, Stat } from "@/components/ui";
import { shortDate } from "@/lib/format";
import type { Campaign } from "@/lib/types";

export const dynamic = "force-dynamic";

function load() {
  const conn = db();
  const campaigns = conn.prepare("SELECT * FROM campaigns ORDER BY created_at DESC LIMIT 50").all() as Campaign[];

  const today = new Date();
  const month = today.getMonth() + 1;
  const day = today.getDate();
  const birthdays = conn.prepare(`
    SELECT id, name, birthday, email, phone FROM customers
    WHERE birthday IS NOT NULL AND CAST(strftime('%m', birthday) AS INTEGER) = ? AND CAST(strftime('%d', birthday) AS INTEGER) BETWEEN ? AND ?
    ORDER BY strftime('%d', birthday) ASC
  `).all(month, day, day + 14) as Array<{ id: number; name: string; birthday: string; email: string | null; phone: string | null }>;

  const recentSent = conn.prepare("SELECT COUNT(*) AS c FROM campaign_sends WHERE sent_at >= datetime('now','-30 days') AND status='ok'").get() as { c: number };

  return { campaigns, birthdays, recentSent: recentSent.c };
}

export default function CampaignsPage() {
  const { campaigns, birthdays, recentSent } = load();
  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Campaigns"
        subtitle="Email + SMS to your client book — for sales, holidays, birthdays, anniversaries, and major events."
        actions={<Link href="/campaigns/new" className="btn btn-primary">+ New Campaign</Link>}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Campaigns" value={campaigns.length} />
        <Stat label="Sent · 30d" value={recentSent} />
        <Stat label="Active triggers" value={campaigns.filter((c) => c.trigger_type !== "manual" && c.status !== "draft").length} />
        <Stat label="Upcoming birthdays · 14d" value={birthdays.length} tone={birthdays.length > 0 ? "accent" as any : "default"} />
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <Card title="Quick send templates" className="lg:col-span-2">
          <div className="grid sm:grid-cols-2 gap-3">
            {QUICK_TEMPLATES.map((t) => (
              <Link key={t.title} href={`/campaigns/new?template=${encodeURIComponent(t.title)}`} className="card p-4 card-hover block">
                <div className="serif text-lg">{t.title}</div>
                <div className="text-xs text-[var(--ink-soft)] mt-1">{t.subtitle}</div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-[var(--ink-mute)]">
                  {t.channel.map((c) => <span key={c} className="chip">{c}</span>)}
                </div>
              </Link>
            ))}
          </div>
        </Card>

        <Card title="Birthdays & anniversaries · next 14 days">
          {birthdays.length === 0 ? (
            <div className="text-sm text-[var(--ink-mute)]">No upcoming birthdays in the next 14 days.</div>
          ) : (
            <div className="space-y-2">
              {birthdays.map((c) => (
                <div key={c.id} className="flex items-center justify-between rounded-lg border border-[var(--line-soft)] p-3">
                  <div>
                    <div className="text-sm">{c.name}</div>
                    <div className="text-[11px] text-[var(--ink-mute)]">{shortDate(c.birthday)}</div>
                  </div>
                  <Link className="btn text-xs" href={`/campaigns/new?template=Birthday&customer_id=${c.id}`}>Send</Link>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <Card title="All campaigns">
        {campaigns.length === 0 ? (
          <div className="text-sm text-[var(--ink-mute)]">No campaigns yet.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Name</th><th>Channel</th><th>Trigger</th><th>Audience</th><th>Status</th><th>Sent</th></tr></thead>
            <tbody>
              {campaigns.map((c) => (
                <tr key={c.id}>
                  <td>{c.name}</td>
                  <td><Chip>{c.channel}</Chip></td>
                  <td>{c.trigger_type}</td>
                  <td>{c.audience}</td>
                  <td><Chip tone={c.status === "sent" ? "good" : c.status === "failed" ? "bad" : c.status === "scheduled" ? "accent" : undefined}>{c.status}</Chip></td>
                  <td>{c.sent_at ? shortDate(c.sent_at) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

const QUICK_TEMPLATES = [
  { title: "Sale announcement", subtitle: "Storewide percentage off, with a CTA to visit.", channel: ["email", "sms"] },
  { title: "Birthday", subtitle: "Personal note + a tasteful birthday discount.", channel: ["email", "sms"] },
  { title: "Anniversary", subtitle: "Mark a customer's first-purchase anniversary.", channel: ["email"] },
  { title: "Holiday — Father's Day", subtitle: "Gift suggestions and gift cards.", channel: ["email"] },
  { title: "Holiday — Christmas", subtitle: "Holiday hours + last-order dates for tailoring.", channel: ["email", "sms"] },
  { title: "Wedding season", subtitle: "Group rentals booking notice.", channel: ["email"] },
  { title: "New arrival", subtitle: "Drop announcement with images and link.", channel: ["email"] },
  { title: "Appointment reminder (24h)", subtitle: "Automated text the day before.", channel: ["sms"] },
];
