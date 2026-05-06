import Link from "next/link";
import { many } from "@/lib/db";
import { dollars } from "@/lib/format";
import { Card, Chip, Empty, PageHeader } from "@/components/ui";
import type { Item, Style } from "@/lib/types";

export const dynamic = "force-dynamic";

type Search = { view?: string; q?: string; cat?: string; filter?: string };

async function load(s: Search) {
  const where: string[] = [];
  const params: any[] = [];
  if (s.q) {
    where.push("(name LIKE ? OR sku LIKE ? OR color LIKE ? OR size LIKE ? OR barcode LIKE ?)");
    const q = `%${s.q}%`;
    params.push(q, q, q, q, q);
  }
  if (s.cat && s.cat !== "all") { where.push("category = ?"); params.push(s.cat); }
  if (s.filter === "low") where.push("quantity <= reorder_point");
  if (s.filter === "rental") where.push("is_rental = 1");
  const sql = `SELECT * FROM items ${where.length ? "WHERE " + where.join(" AND ") : ""} ORDER BY category, name, color, size`;
  const items = await many<Item>(sql, params);
  const styles = await many<Style>("SELECT * FROM styles ORDER BY category, name");
  const categories = (await many<{ category: string }>("SELECT DISTINCT category FROM items ORDER BY category")).map((r) => r.category);
  return { items, styles, categories };
}

export default async function InventoryPage({ searchParams }: { searchParams: Search }) {
  const { items, styles, categories } = await load(searchParams);
  const view = searchParams.view === "list" ? "list" : "matrix";
  const totalUnits = items.reduce((a, b) => a + b.quantity, 0);
  const totalValue = items.reduce((a, b) => a + b.quantity * b.cost_cents, 0);
  const lowCount = items.filter((i) => i.quantity <= i.reorder_point).length;

  return (
    <>
      <PageHeader
        eyebrow="Inventory"
        title="The Stockroom"
        subtitle={`${items.length} variants · ${totalUnits} units on hand · ${dollars(totalValue)} at cost`}
        actions={
          <>
            <Link href="/inventory/new" className="btn">+ Add Item</Link>
            <Link href="/inventory/styles/new" className="btn btn-primary">+ New Style</Link>
          </>
        }
      />

      <form className="card p-4 mb-6 flex flex-wrap items-center gap-3" action="/inventory">
        <input name="q" defaultValue={searchParams.q || ""} placeholder="Search name, SKU, color, size, barcode…" className="input flex-1 min-w-[260px]" />
        <select name="cat" defaultValue={searchParams.cat || "all"} className="select w-44">
          <option value="all">All categories</option>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select name="filter" defaultValue={searchParams.filter || ""} className="select w-44">
          <option value="">All stock</option>
          <option value="low">Low stock</option>
          <option value="rental">Rental fleet</option>
        </select>
        <input type="hidden" name="view" value={view} />
        <button className="btn btn-primary">Filter</button>
        <div className="flex items-center gap-1 ml-auto rounded-lg p-1 bg-[var(--bg-elev-2)] border border-[var(--line-soft)]">
          <Link href={{ pathname: "/inventory", query: { ...searchParams, view: "matrix" } }} className={`px-3 py-1.5 rounded text-sm ${view === "matrix" ? "bg-[var(--bg-elev)] border border-[var(--line)]" : "text-[var(--ink-soft)]"}`}>Matrix</Link>
          <Link href={{ pathname: "/inventory", query: { ...searchParams, view: "list" } }} className={`px-3 py-1.5 rounded text-sm ${view === "list" ? "bg-[var(--bg-elev)] border border-[var(--line)]" : "text-[var(--ink-soft)]"}`}>List</Link>
        </div>
      </form>

      {items.length === 0 ? (
        <Empty title="No matching items" hint="Try clearing filters or add new inventory." cta="+ Add Item" href="/inventory/new" />
      ) : view === "matrix" ? (
        <MatrixView styles={styles} items={items} />
      ) : (
        <ListView items={items} />
      )}

      {lowCount > 0 && (
        <div className="mt-6 flex items-center gap-2 text-sm text-[var(--warn)]">
          <span>⚠</span>
          <span>{lowCount} variant{lowCount === 1 ? "" : "s"} at or below reorder point.</span>
          <Link href="/inventory?filter=low" className="text-[var(--accent-soft)] hover:underline">Show only low →</Link>
        </div>
      )}
    </>
  );
}

function MatrixView({ styles, items }: { styles: Style[]; items: Item[] }) {
  const byStyle = new Map<number, Item[]>();
  const orphans: Item[] = [];
  for (const i of items) {
    if (i.style_id == null) { orphans.push(i); continue; }
    if (!byStyle.has(i.style_id)) byStyle.set(i.style_id, []);
    byStyle.get(i.style_id)!.push(i);
  }
  const visibleStyles = styles.filter((s) => byStyle.has(s.id));
  return (
    <div className="space-y-6">
      {visibleStyles.map((s) => {
        const its = byStyle.get(s.id)!;
        const sizes = Array.from(new Set(its.map((i) => i.size || "—"))).sort();
        const colors = Array.from(new Set(its.map((i) => i.color || "—")));
        const lookup = new Map<string, Item>();
        for (const it of its) lookup.set(`${it.color || "—"}|${it.size || "—"}`, it);
        const totals = its.reduce((a, b) => a + b.quantity, 0);
        const value = its.reduce((a, b) => a + b.quantity * b.cost_cents, 0);
        return (
          <Card key={s.id}>
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h3 className="serif text-2xl">{s.name}</h3>
                  {s.is_rental ? <Chip tone="accent">Rental</Chip> : <Chip>Retail</Chip>}
                  <span className="mono text-xs text-[var(--ink-mute)]">{s.style_code}</span>
                </div>
                <div className="text-sm text-[var(--ink-soft)] mt-1">{s.category} · {dollars(s.base_price_cents)} retail · {totals} units · {dollars(value)} at cost</div>
              </div>
            </div>
            <div className="overflow-x-auto scrollbar">
              <table className="table">
                <thead>
                  <tr>
                    <th>Color \\ Size</th>
                    {sizes.map((sz) => <th key={sz} className="text-center">{sz}</th>)}
                    <th className="text-right">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {colors.map((color) => {
                    const rowTotal = sizes.reduce((acc, sz) => acc + (lookup.get(`${color}|${sz}`)?.quantity || 0), 0);
                    return (
                      <tr key={color}>
                        <td className="font-medium">{color}</td>
                        {sizes.map((sz) => {
                          const it = lookup.get(`${color}|${sz}`);
                          if (!it) return <td key={sz} className="text-center text-[var(--ink-mute)]">·</td>;
                          const low = it.quantity <= it.reorder_point;
                          const out = it.quantity === 0;
                          return (
                            <td key={sz} className="text-center">
                              <Link href={`/inventory/${it.id}`} className={`inline-flex items-center justify-center w-12 h-9 rounded border ${out ? "border-[var(--bad)]/40 text-[var(--bad)]" : low ? "border-[var(--warn)]/40 text-[var(--warn)]" : "border-[var(--line-soft)] hover:border-[var(--accent)]"} `}>{it.quantity}</Link>
                            </td>
                          );
                        })}
                        <td className="text-right text-[var(--ink-soft)]">{rowTotal}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        );
      })}
      {orphans.length > 0 && (
        <Card title="Unlinked items">
          <ListView items={orphans} />
        </Card>
      )}
    </div>
  );
}

function ListView({ items }: { items: Item[] }) {
  return (
    <div className="card overflow-hidden">
      <table className="table">
        <thead>
          <tr>
            <th>Item</th><th>SKU</th><th>Color</th><th>Size</th><th>Stock</th><th>Cost</th><th>Price</th><th></th>
          </tr>
        </thead>
        <tbody>
          {items.map((i) => {
            const low = i.quantity <= i.reorder_point;
            return (
              <tr key={i.id}>
                <td>
                  <Link href={`/inventory/${i.id}`} className="font-medium hover:text-[var(--accent-soft)]">{i.name}</Link>
                  <div className="text-xs text-[var(--ink-mute)]">{i.category}{i.is_rental ? " · rental" : ""}</div>
                </td>
                <td className="mono text-xs">{i.sku}</td>
                <td>{i.color || "—"}</td>
                <td>{i.size || "—"}</td>
                <td>{low ? <Chip tone={i.quantity === 0 ? "bad" : "warn"}>{i.quantity}</Chip> : i.quantity}</td>
                <td>{dollars(i.cost_cents)}</td>
                <td>{dollars(i.price_cents)}</td>
                <td className="text-right"><Link href={`/inventory/${i.id}`} className="text-sm text-[var(--accent-soft)]">Open →</Link></td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
