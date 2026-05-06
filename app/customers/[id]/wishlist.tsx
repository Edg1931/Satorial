"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Chip } from "@/components/ui";

export default function WishlistManager({ customerId, initial }: { customerId: number; initial: any[] }) {
  const router = useRouter();
  const [items, setItems] = useState(initial);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [v, setV] = useState({ search: "", label: "", notify_email: 1, notify_sms: 0 });
  const [results, setResults] = useState<any[]>([]);

  async function search() {
    if (!v.search) return setResults([]);
    const r = await fetch(`/api/inventory/search?q=${encodeURIComponent(v.search)}`);
    setResults(await r.json());
  }

  async function add(itemId: number | null, label: string) {
    setBusy(true);
    const r = await fetch("/api/wishlist", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ customer_id: customerId, item_id: itemId, label, notify_email: v.notify_email, notify_sms: v.notify_sms }),
    });
    setBusy(false);
    if (r.ok) { setAdding(false); setV({ search: "", label: "", notify_email: 1, notify_sms: 0 }); setResults([]); router.refresh(); }
  }

  async function remove(id: number) {
    await fetch(`/api/wishlist/${id}`, { method: "DELETE" });
    setItems((s) => s.filter((x) => x.id !== id));
  }

  return (
    <Card title="Wishlist & back-in-stock alerts">
      {items.length === 0 ? (
        <div className="text-sm text-[var(--ink-mute)]">Nothing on the wishlist yet.</div>
      ) : (
        <div className="space-y-2">
          {items.map((w) => (
            <div key={w.id} className="flex items-center justify-between rounded-lg border border-[var(--line-soft)] p-3">
              <div>
                <div className="text-sm">{w.item_name || w.label || "Custom request"}</div>
                <div className="text-[11px] text-[var(--ink-mute)]">{[w.color, w.size].filter(Boolean).join(" · ") || "—"}</div>
              </div>
              <div className="flex items-center gap-2">
                {w.item_id && (w.quantity ?? 0) > 0 ? <Chip tone="good">In stock</Chip> : <Chip tone="warn">Out</Chip>}
                {w.notified_at && <Chip>notified</Chip>}
                <button className="btn text-xs" onClick={() => remove(w.id)}>✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {!adding ? (
        <button className="btn mt-3" onClick={() => setAdding(true)}>+ Add to wishlist</button>
      ) : (
        <div className="mt-3 space-y-2">
          <div className="flex gap-2">
            <input className="input flex-1" placeholder="Search inventory…" value={v.search} onChange={(e) => setV({ ...v, search: e.target.value })} />
            <button className="btn" type="button" onClick={search}>Search</button>
          </div>
          {results.length > 0 && (
            <div className="space-y-1 max-h-48 overflow-y-auto scrollbar">
              {results.map((r) => (
                <button key={r.id} type="button" className="w-full text-left text-sm rounded border border-[var(--line-soft)] p-2 hover:border-[var(--accent)]" onClick={() => add(r.id, r.name)} disabled={busy}>
                  <div className="flex justify-between"><span>{r.name}</span><span className="text-[var(--ink-mute)] text-[11px]">{[r.color, r.size].filter(Boolean).join(" · ")}</span></div>
                </button>
              ))}
            </div>
          )}
          <input className="input" placeholder="Or describe a custom request" value={v.label} onChange={(e) => setV({ ...v, label: e.target.value })} />
          <div className="flex items-center gap-3 text-xs">
            <label className="flex items-center gap-1"><input type="checkbox" checked={!!v.notify_email} onChange={(e) => setV({ ...v, notify_email: e.target.checked ? 1 : 0 })} /> Email</label>
            <label className="flex items-center gap-1"><input type="checkbox" checked={!!v.notify_sms} onChange={(e) => setV({ ...v, notify_sms: e.target.checked ? 1 : 0 })} /> SMS</label>
            <div className="ml-auto flex gap-2">
              <button className="btn text-xs" onClick={() => setAdding(false)}>Cancel</button>
              {v.label && <button disabled={busy} onClick={() => add(null, v.label)} className="btn btn-primary text-xs">Add custom</button>}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
