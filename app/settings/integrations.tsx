"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Integration } from "@/lib/types";
import { Chip } from "@/components/ui";

const PROVIDER_META: Record<string, { label: string; description: string; fields: Array<{ key: string; label: string; type?: string; placeholder?: string }> }> = {
  clover: {
    label: "Clover POS",
    description: "Two-way sync with your Clover register: pull inventory and push sales recorded in Satorial.",
    fields: [
      { key: "merchantId", label: "Merchant ID" },
      { key: "apiToken", label: "API Token", type: "password" },
      { key: "baseUrl", label: "Base URL", placeholder: "https://api.clover.com" },
    ],
  },
  twilio: {
    label: "Twilio (SMS)",
    description: "Send SMS campaigns and appointment reminders.",
    fields: [
      { key: "accountSid", label: "Account SID" },
      { key: "authToken", label: "Auth Token", type: "password" },
      { key: "from", label: "From number", placeholder: "+15551234567" },
    ],
  },
  resend: {
    label: "Resend (Email)",
    description: "Transactional + marketing email. Verify your sending domain in Resend first.",
    fields: [
      { key: "apiKey", label: "API Key", type: "password" },
      { key: "from", label: "From address", placeholder: "Satorial <hello@yourshop.com>" },
    ],
  },
};

export default function IntegrationManager({ integrations }: { integrations: Integration[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<string | null>(null);
  const [config, setConfig] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function open(provider: string) {
    setEditing(provider);
    const i = integrations.find((x) => x.provider === provider);
    setConfig(i?.config ? JSON.parse(i.config) : {});
    setMsg(null);
  }

  async function save() {
    if (!editing) return;
    setBusy(true);
    const r = await fetch(`/api/integrations/${editing}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(config) });
    const j = await r.json();
    setBusy(false);
    setMsg(j.ok ? `Saved.${j.summary ? " " + j.summary : ""}` : j.error || "Failed");
    if (j.ok) router.refresh();
  }

  async function disconnect(provider: string) {
    if (!confirm(`Disconnect ${PROVIDER_META[provider]?.label || provider}?`)) return;
    await fetch(`/api/integrations/${provider}`, { method: "DELETE" });
    router.refresh();
  }

  async function syncClover() {
    setBusy(true);
    setMsg("Syncing…");
    const r = await fetch(`/api/integrations/clover/sync`, { method: "POST" });
    const j = await r.json();
    setBusy(false);
    setMsg(r.ok ? `Synced — ${j.created} new, ${j.updated} updated.` : j.error || "Sync failed");
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {integrations.map((i) => {
        const meta = PROVIDER_META[i.provider];
        if (!meta) return null;
        const isEditing = editing === i.provider;
        return (
          <div key={i.id} className="rounded-lg border border-[var(--line-soft)] p-4">
            <div className="flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <div className="serif text-lg">{meta.label}</div>
                <div className="text-xs text-[var(--ink-soft)] mt-0.5">{meta.description}</div>
              </div>
              {i.status === "connected" ? <Chip tone="good">Connected</Chip> : i.status === "error" ? <Chip tone="bad">Error</Chip> : <Chip>Disconnected</Chip>}
              {!isEditing ? (
                <button className="btn text-xs" onClick={() => open(i.provider)}>{i.status === "connected" ? "Edit" : "Connect"}</button>
              ) : (
                <button className="btn text-xs" onClick={() => setEditing(null)}>Cancel</button>
              )}
            </div>
            {i.last_sync_summary && <div className="text-[11px] text-[var(--ink-mute)] mt-2">Last sync: {i.last_sync_summary}</div>}
            {isEditing && (
              <div className="mt-3 space-y-2">
                {meta.fields.map((f) => (
                  <input
                    key={f.key}
                    className="input mono text-sm"
                    type={f.type || "text"}
                    placeholder={`${f.label}${f.placeholder ? " · " + f.placeholder : ""}`}
                    value={config[f.key] || ""}
                    onChange={(e) => setConfig((c) => ({ ...c, [f.key]: e.target.value }))}
                  />
                ))}
                <div className="flex items-center justify-end gap-2">
                  {i.provider === "clover" && i.status === "connected" && <button onClick={syncClover} disabled={busy} className="btn text-xs mr-auto">Pull inventory now</button>}
                  {i.status === "connected" && <button onClick={() => disconnect(i.provider)} className="btn btn-danger text-xs" disabled={busy}>Disconnect</button>}
                  <button onClick={save} className="btn btn-primary text-xs" disabled={busy}>{busy ? "…" : "Save & verify"}</button>
                </div>
                {msg && <div className="text-xs text-[var(--ink-soft)]">{msg}</div>}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
