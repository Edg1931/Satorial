import { notFound } from "next/navigation";
import { many, one } from "@/lib/db";
import type { GroupOrder, Appointment } from "@/lib/types";
import WeddingPortalForm from "./form";

export const dynamic = "force-dynamic";

export default async function WeddingPortal({ params }: { params: { token: string } }) {
  const portal = await one<{ group_order_id: number }>("SELECT group_order_id FROM wedding_portals WHERE token = ?", [params.token]);
  if (!portal) notFound();
  const group = await one<GroupOrder>("SELECT * FROM group_orders WHERE id = ?", [portal.group_order_id]);
  if (!group) notFound();
  const members = await many<Appointment>("SELECT * FROM appointments WHERE group_order_id = ? ORDER BY customer_name", [group.id]);

  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--ink)]">
      <header className="border-b border-[var(--line-soft)] py-6 px-6">
        <div className="max-w-3xl mx-auto flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-[var(--accent)] grid place-items-center text-[#1a1408] font-bold serif text-lg">S</div>
          <div>
            <div className="serif text-xl leading-none">Satorial</div>
            <div className="text-[10px] uppercase tracking-[0.18em] text-[var(--ink-mute)] mt-1">Wedding Concierge</div>
          </div>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="label mb-2">{group.event_type || "Event"}{group.event_date ? ` · ${group.event_date}` : ""}</div>
        <h1 className="serif text-4xl mb-3">{group.name}</h1>
        <p className="text-[var(--ink-soft)] mb-8">
          Welcome. This is your private link — share it with the gentlemen in your party. Each person should fill out their measurements and size selections so we can have everything ready in advance.
        </p>

        <div className="card p-5 mb-6">
          <div className="text-sm text-[var(--ink-soft)] mb-3">Currently in this party</div>
          {members.length === 0 ? (
            <div className="text-sm text-[var(--ink-mute)]">No one yet — be the first.</div>
          ) : (
            <ul className="text-sm space-y-1">
              {members.map((m) => <li key={m.id} className="flex items-center justify-between"><span>{m.customer_name}</span><span className="text-[var(--ink-mute)] text-[11px]">{m.stage.replace("_", " ")}</span></li>)}
            </ul>
          )}
        </div>

        <div className="card p-5">
          <h2 className="serif text-2xl mb-4">Add yourself to the party</h2>
          <WeddingPortalForm token={params.token} />
        </div>

        <p className="text-[11px] text-[var(--ink-mute)] mt-6">By submitting you agree to be contacted by the shop about your fitting and pickup.</p>
      </main>
    </div>
  );
}
