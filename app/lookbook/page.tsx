import { db } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import { dollars } from "@/lib/format";
import LookbookGenerator from "./generator";
import type { LookbookEntry, Item } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function LookbookPage() {
  const conn = db();
  const items = conn.prepare(`SELECT id, sku, name, color, size, category, price_cents FROM items WHERE quantity > 0 ORDER BY category, name LIMIT 50`).all() as Item[];
  const entries = conn.prepare(`SELECT * FROM lookbook ORDER BY created_at DESC LIMIT 50`).all() as LookbookEntry[];

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Look Book"
        subtitle="AI-generated descriptions for each piece. One click pushes a polished post to your Social composer."
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card title="Inventory">
            <div className="grid sm:grid-cols-2 gap-3 max-h-[80vh] overflow-y-auto scrollbar pr-1">
              {items.map((it) => (
                <LookbookGenerator key={it.id} item={it} />
              ))}
            </div>
          </Card>
        </div>

        <Card title="Saved entries">
          {entries.length === 0 ? (
            <div className="text-sm text-[var(--ink-mute)]">No look book entries yet.</div>
          ) : (
            <div className="space-y-3 max-h-[80vh] overflow-y-auto scrollbar pr-1">
              {entries.map((e) => (
                <div key={e.id} className="rounded-lg border border-[var(--line-soft)] p-3">
                  <div className="serif text-lg">{e.title}</div>
                  <div className="text-xs text-[var(--ink-soft)] mt-1 whitespace-pre-wrap">{e.caption}</div>
                  {e.hashtags && <div className="text-[11px] text-[var(--accent-soft)] mt-2">{e.hashtags}</div>}
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </>
  );
}
