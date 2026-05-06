import { many } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import NewSaleForm from "./form";
import type { Customer, Item } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewSalePage() {
  const items = await many<Item>("SELECT * FROM items WHERE quantity > 0 ORDER BY category, name");
  const customers = await many<Customer>("SELECT * FROM customers ORDER BY name");
  return (
    <>
      <PageHeader eyebrow="Sales" title="New Sale" subtitle="Build a ticket. Scan or pick items, take payment, and decrement inventory." />
      <Card><NewSaleForm items={items} customers={customers} /></Card>
    </>
  );
}
