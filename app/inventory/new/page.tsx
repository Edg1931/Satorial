import { many } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import NewItemForm from "./form";
import type { Style } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewItemPage() {
  const styles = await many<Style>("SELECT * FROM styles ORDER BY category, name");
  return (
    <>
      <PageHeader eyebrow="Inventory" title="Add Item" subtitle="Create a single SKU. To create a master style with multiple variants, use 'New Style'." />
      <Card><NewItemForm styles={styles} /></Card>
    </>
  );
}
