import { Card, PageHeader } from "@/components/ui";
import NewGroupForm from "./form";

export default function NewGroupPage() {
  return (
    <>
      <PageHeader eyebrow="Calendar" title="New Group Order" subtitle="Wedding parties, prom groups, corporate events. Add members one by one after creating the parent." />
      <Card><NewGroupForm /></Card>
    </>
  );
}
