import Link from "next/link";
import { notFound } from "next/navigation";
import { many, one } from "@/lib/db";
import { dollars, shortDate } from "@/lib/format";
import { Card, Chip, PageHeader } from "@/components/ui";
import { code128SVG } from "@/lib/barcode";
import type { Item } from "@/lib/types";
import EditItemForm from "./edit-form";

export const dynamic = "force-dynamic";

export default async function ItemDetail({ params }: { params: { id: string } }) {
  const item = await one<Item>("SELECT * FROM items WHERE id = ?", [params.id]);
  if (!item) notFound();
  const sales = await many<{ id: number; sold_at: string; quantity: number; unit_price_cents: number; customer_name: string | null }>(`
    SELECT s.id, s.sold_at, si.quantity, si.unit_price_cents, s.customer_name
    FROM sale_items si JOIN sales s ON s.id = si.sale_id
    WHERE si.item_id = ? ORDER BY s.sold_at DESC LIMIT 12
  `, [item.id]);

  const totalSold = Number((await one<{ q: number }>(`SELECT COALESCE(SUM(quantity),0) as q FROM sale_items WHERE item_id = ?`, [item.id]))!.q);

  const svg = code128SVG(item.barcode, { height: 70, width: 2 });

  return (
    <>
      <PageHeader
        eyebrow={`Inventory · ${item.category}`}
        title={item.name}
        subtitle={`${[item.color, item.size, item.material].filter(Boolean).join(" · ")} · SKU ${item.sku}`}
        actions={<Link href="/inventory" className="btn">← All inventory</Link>}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <Card title="Stock & Pricing" className="lg:col-span-2">
          <EditItemForm item={item} />
        </Card>

        <div className="space-y-6">
          <Card title="Barcode">
            <div className="rounded-lg bg-white p-4 grid place-items-center" dangerouslySetInnerHTML={{ __html: svg }} />
            <div className="mt-3 mono text-sm text-center text-[var(--ink-soft)]">{item.barcode}</div>
            <div className="flex gap-2 mt-3">
              <a href={`/api/barcode/${item.barcode}.svg`} target="_blank" rel="noreferrer" className="btn flex-1 justify-center">Download SVG</a>
              <a href={`/api/barcode/${item.barcode}.svg?print=1`} target="_blank" rel="noreferrer" className="btn flex-1 justify-center">Print sheet</a>
            </div>
          </Card>

          <Card title="At a glance">
            <div className="space-y-2.5 text-sm">
              <Row k="On hand" v={<><span className="font-medium">{item.quantity}</span>{item.quantity <= item.reorder_point && <span className="ml-2"><Chip tone={item.quantity === 0 ? "bad" : "warn"}>Reorder</Chip></span>}</>} />
              <Row k="Reorder point" v={String(item.reorder_point)} />
              <Row k="Cost" v={dollars(item.cost_cents)} />
              <Row k="Price" v={dollars(item.price_cents)} />
              <Row k="Margin" v={`${item.price_cents > 0 ? Math.round(((item.price_cents - item.cost_cents) / item.price_cents) * 100) : 0}%`} />
              <Row k="Supplier" v={item.supplier || "—"} />
              <Row k="Location" v={item.location || "—"} />
              <Row k="Sold (all-time)" v={String(totalSold)} />
            </div>
          </Card>
        </div>
      </div>

      <Card title="Recent sales" className="mt-6">
        {sales.length === 0 ? (
          <div className="text-sm text-[var(--ink-mute)]">No sales recorded yet.</div>
        ) : (
          <table className="table">
            <thead><tr><th>Date</th><th>Customer</th><th>Qty</th><th className="text-right">Price</th></tr></thead>
            <tbody>
              {sales.map((s) => (
                <tr key={s.id}>
                  <td>{shortDate(s.sold_at)}</td>
                  <td>{s.customer_name || "Walk-in"}</td>
                  <td>{s.quantity}</td>
                  <td className="text-right">{dollars(s.unit_price_cents * s.quantity)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}

function Row({ k, v }: { k: string; v: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-[var(--ink-mute)]">{k}</span>
      <span>{v}</span>
    </div>
  );
}
