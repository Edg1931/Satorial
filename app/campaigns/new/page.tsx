import { db } from "@/lib/db";
import { Card, PageHeader } from "@/components/ui";
import CampaignForm from "./form";
import type { Customer } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function NewCampaignPage({ searchParams }: { searchParams: { template?: string; customer_id?: string } }) {
  const customers = db().prepare("SELECT * FROM customers ORDER BY name").all() as Customer[];
  return (
    <>
      <PageHeader eyebrow="Marketing" title="New Campaign" subtitle="Compose with AI, choose your audience, send via email and/or SMS." />
      <Card>
        <CampaignForm customers={customers} template={searchParams.template} customerId={searchParams.customer_id ? Number(searchParams.customer_id) : null} />
      </Card>
    </>
  );
}
