import { db } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import NewSaleForm from "./form";
import type { Customer, Item } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function NewSalePage() {
  const conn = db();
  const items = conn.prepare("SELECT * FROM items WHERE quantity > 0 ORDER BY category, name").all() as Item[];
  const customers = conn.prepare("SELECT * FROM customers ORDER BY name").all() as Customer[];
  return (
    <>
      <PageHeader eyebrow="Sales" title="New Sale" subtitle="Build a ticket. Scan or pick items, take payment, and decrement inventory." />
      <Card><NewSaleForm items={items} customers={customers} /></Card>
    </>
  );
}
