import { Card, PageHeader } from "@/components/ui";
import ExpenseForm from "./form";
export default function NewExpensePage() {
  return (
    <>
      <PageHeader eyebrow="Finance" title="Log expense" />
      <Card><ExpenseForm /></Card>
    </>
  );
}
