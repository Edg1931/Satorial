import { PageHeader } from "@/components/ui";
import AIChat from "./chat";
import { aiEnabled } from "@/lib/ai";

export const dynamic = "force-dynamic";

export default function AIPage() {
  return (
    <>
      <PageHeader
        eyebrow="AI Partner"
        title="Your retail co-pilot"
        subtitle="Grounded in live inventory, sales, and appointment data. Ask it for reorder calls, marketing copy, weekly recaps — anything an experienced GM would help with."
      />
      {!aiEnabled() && (
        <div className="card p-4 mb-4 text-sm text-[var(--ink-soft)]">
          ⚠ <span className="font-medium">No API key set.</span> Add <span className="kbd">ANTHROPIC_API_KEY</span> to your environment to enable live answers. The chat will still respond with a local snapshot of your business.
        </div>
      )}
      <AIChat />
    </>
  );
}
