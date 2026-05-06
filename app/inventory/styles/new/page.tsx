import { Card, PageHeader } from "@/components/ui";
import NewStyleForm from "./form";

export const dynamic = "force-dynamic";

export default function NewStylePage() {
  return (
    <>
      <PageHeader eyebrow="Inventory" title="New Style" subtitle="Define a master product, then auto-generate a size × color matrix of variants. Each variant gets its own SKU and barcode." />
      <Card><NewStyleForm /></Card>
    </>
  );
}
