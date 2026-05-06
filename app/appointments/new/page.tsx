import { many } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import NewAppointmentForm from "./form";
import type { Customer, GroupOrder } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function NewAppointmentPage({ searchParams }: { searchParams: { customer_id?: string; group_id?: string; type?: string } }) {
  const customers = await many<Customer>("SELECT * FROM customers ORDER BY name");
  const groups = await many<GroupOrder>("SELECT * FROM group_orders ORDER BY event_date DESC");
  return (
    <>
      <PageHeader eyebrow="Calendar" title="New Appointment" subtitle="Custom suit, rental, fitting, or consultation." />
      <Card>
        <NewAppointmentForm
          customers={customers}
          groups={groups}
          defaultCustomerId={searchParams.customer_id ? Number(searchParams.customer_id) : null}
          defaultGroupId={searchParams.group_id ? Number(searchParams.group_id) : null}
          defaultType={searchParams.type || "custom_suit"}
        />
      </Card>
    </>
  );
}
