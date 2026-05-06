import { PageHeader } from "@/components/ui";
import Scanner from "./scanner";

export const dynamic = "force-dynamic";

export default function ScanPage({ searchParams }: { searchParams: { code?: string } }) {
  return (
    <>
      <PageHeader
        eyebrow="Scanner"
        title="Scan a barcode"
        subtitle="Point your camera at any item barcode. Or type/paste the code below. We'll look it up instantly."
      />
      <Scanner initialCode={searchParams.code || ""} />
    </>
  );
}
