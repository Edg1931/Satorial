import { db } from "@/lib/db";
import { Card, Chip, PageHeader } from "@/components/ui";
import StaffManager from "./staff";
import IntegrationManager from "./integrations";
import { aiEnabled } from "@/lib/ai";
import type { Integration, Staff } from "@/lib/types";

export const dynamic = "force-dynamic";

export default function SettingsPage() {
  const conn = db();
  const staff = conn.prepare("SELECT * FROM staff ORDER BY active DESC, name").all() as Staff[];
  const integrations = conn.prepare("SELECT * FROM integrations ORDER BY provider").all() as Integration[];

  return (
    <>
      <PageHeader eyebrow="Admin" title="Settings" subtitle="People, integrations, and how the system talks to the outside world." />

      <div className="grid lg:grid-cols-2 gap-6">
        <Card title="AI Partner">
          <div className="text-sm space-y-2">
            <div className="flex items-center justify-between">
              <span>Anthropic API key</span>
              {aiEnabled() ? <Chip tone="good">Configured</Chip> : <Chip tone="warn">Not set</Chip>}
            </div>
            <div className="text-xs text-[var(--ink-mute)]">
              Set <span className="kbd">ANTHROPIC_API_KEY</span> in your environment to enable live AI. The model defaults to <span className="kbd">claude-sonnet-4-6</span> (override with <span className="kbd">ANTHROPIC_MODEL</span>).
            </div>
          </div>
        </Card>
        <Card title="Database">
          <div className="text-sm">
            SQLite at <span className="kbd">data/satorial.db</span>. Override with <span className="kbd">SATORIAL_DB_PATH</span>.
          </div>
        </Card>
      </div>

      <Card title="Staff" className="mt-6">
        <StaffManager staff={staff} />
      </Card>

      <Card title="Integrations" className="mt-6">
        <IntegrationManager integrations={integrations} />
      </Card>
    </>
  );
}
