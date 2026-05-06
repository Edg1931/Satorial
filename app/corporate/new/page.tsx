import { Card, PageHeader } from "@/components/ui";
import NewCorporateForm from "./form";
export default function NewCorporatePage() {
  return (
    <>
      <PageHeader eyebrow="B2B" title="New Corporate Account" />
      <Card><NewCorporateForm /></Card>
    </>
  );
}
