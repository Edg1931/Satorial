import { Card, PageHeader } from "@/components/ui";
import POForm from "./form";

export default function NewPOPage() {
  return (
    <>
      <PageHeader eyebrow="Finance" title="Purchase Order" subtitle="Log inbound stock you've ordered. When received, costs and quantities will roll into inventory." />
      <Card><POForm /></Card>
    </>
  );
}
