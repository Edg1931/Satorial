import { Card, PageHeader } from "@/components/ui";
import NewCustomerForm from "./form";

export default function NewCustomerPage() {
  return (
    <>
      <PageHeader eyebrow="Customers" title="Add Customer" />
      <Card><NewCustomerForm /></Card>
    </>
  );
}
