import Link from "next/link";
import { many, one } from "@/lib/db";
import { Card, Chip, PageHeader, Stat } from "@/components/ui";
import { shortDate } from "@/lib/format";
import RunQueue from "./run-queue";
import type { DripFlow, DripFlowStep } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function DripsPage() {
  const flows = await many<DripFlow>("SELECT * FROM drip_flows ORDER BY name");
  const allSteps = await many<DripFlowStep>("SELECT * FROM drip_flow_steps ORDER BY flow_id, sequence");
  const stepsByFlow = new Map<number, DripFlowStep[]>();
  for (const s of allSteps) {
    if (!stepsByFlow.has(s.flow_id)) stepsByFlow.set(s.flow_id, []);
    stepsByFlow.get(s.flow_id)!.push(s);
  }
  const activeC = Number((await one<{ c: number }>("SELECT COUNT(*) AS c FROM drip_enrollments WHERE status='active'"))!.c);
  const dueC = Number((await one<{ c: number }>("SELECT COUNT(*) AS c FROM drip_enrollments WHERE status='active' AND next_run_at <= datetime('now')"))!.c);

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Automated drip flows"
        subtitle="Sequenced touches triggered by lifecycle events — welcome, post-purchase fit, care guide, win-back, review request."
        actions={<RunQueue dueNow={dueC} />}
      />

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <Stat label="Active flows" value={flows.filter((f) => f.active).length} />
        <Stat label="Customers enrolled" value={activeC} />
        <Stat label="Due to send" value={dueC} tone={dueC > 0 ? "warn" : "good"} />
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        {flows.map((f) => {
          const steps = stepsByFlow.get(f.id) || [];
          return (
            <Card key={f.id} title={f.name}>
              <div className="text-sm text-[var(--ink-soft)] mb-2">{f.description}</div>
              <div className="flex items-center gap-2 mb-3">
                <Chip tone="accent">{f.trigger.replace("_", " ")}</Chip>
                <Chip tone={f.active ? "good" : "bad"}>{f.active ? "Active" : "Off"}</Chip>
              </div>
              <ol className="space-y-2 text-sm">
                {steps.map((s) => (
                  <li key={s.id} className="rounded-lg border border-[var(--line-soft)] p-3">
                    <div className="flex items-center justify-between">
                      <div className="text-[11px] uppercase tracking-wider text-[var(--ink-mute)]">Day {s.delay_days} · {s.channel}</div>
                    </div>
                    {s.subject && <div className="font-medium text-sm mt-1">{s.subject}</div>}
                    <div className="text-xs text-[var(--ink-soft)] whitespace-pre-wrap mt-1">{s.body.length > 160 ? s.body.slice(0, 160) + "…" : s.body}</div>
                  </li>
                ))}
              </ol>
            </Card>
          );
        })}
      </div>
    </>
  );
}
