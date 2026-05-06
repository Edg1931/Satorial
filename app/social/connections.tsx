"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Card, Chip } from "@/components/ui";
import { PLATFORM_META } from "@/lib/social/connectors";
import type { SocialConnection } from "@/lib/types";

export default function ConnectionList({ connections }: { connections: SocialConnection[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState<number | null>(null);
  const [token, setToken] = useState("");
  const [accountId, setAccountId] = useState("");
  const [handle, setHandle] = useState("");
  const [busy, setBusy] = useState(false);

  function open(c: SocialConnection) {
    setEditing(c.id);
    setToken(c.access_token || "");
    setAccountId(c.account_id || "");
    setHandle(c.account_handle || "");
  }

  async function save(c: SocialConnection) {
    setBusy(true);
    await fetch(`/api/social/connections/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: token, account_id: accountId, account_handle: handle, status: token ? "connected" : "disconnected" }),
    });
    setBusy(false);
    setEditing(null);
    router.refresh();
  }

  async function disconnect(c: SocialConnection) {
    setBusy(true);
    await fetch(`/api/social/connections/${c.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ access_token: null, account_id: null, status: "disconnected" }),
    });
    setBusy(false);
    router.refresh();
  }

  return (
    <Card title="Connected channels">
      <div className="space-y-2">
        {connections.map((c) => {
          const meta = PLATFORM_META[c.platform];
          const isEditing = editing === c.id;
          return (
            <div key={c.id} className="rounded-lg border border-[var(--line-soft)] p-3">
              <div className="flex items-center gap-3">
                <span className="w-3 h-3 rounded-full" style={{ background: meta.color }} />
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium">{meta.label}</div>
                  <div className="text-[11px] text-[var(--ink-mute)]">{c.account_handle || "—"}</div>
                </div>
                {c.status === "connected" ? <Chip tone="good">Connected</Chip> : <Chip>Disconnected</Chip>}
                {!isEditing ? (
                  <button className="btn text-xs" onClick={() => open(c)}>{c.status === "connected" ? "Edit" : "Connect"}</button>
                ) : (
                  <button className="btn text-xs" onClick={() => setEditing(null)}>Cancel</button>
                )}
              </div>
              {isEditing && (
                <div className="mt-3 space-y-2">
                  <input className="input" placeholder="Account handle (e.g. @satorial)" value={handle} onChange={(e) => setHandle(e.target.value)} />
                  <input className="input" placeholder="Account ID / Page ID (Meta) or User URN (LinkedIn)" value={accountId} onChange={(e) => setAccountId(e.target.value)} />
                  <input className="input mono text-xs" placeholder="Access token (long-lived)" value={token} onChange={(e) => setToken(e.target.value)} />
                  <div className="flex items-center gap-2">
                    <a href={meta.oauthDocs} target="_blank" rel="noreferrer" className="text-xs text-[var(--accent-soft)]">How to get a token →</a>
                    <div className="ml-auto flex gap-2">
                      {c.status === "connected" && <button onClick={() => disconnect(c)} className="btn btn-danger text-xs" disabled={busy}>Disconnect</button>}
                      <button onClick={() => save(c)} className="btn btn-primary text-xs" disabled={busy}>{busy ? "…" : "Save"}</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="text-[11px] text-[var(--ink-mute)] mt-3">
        Tokens are stored in your local database. Posts to disconnected channels are <em>simulated</em> (saved to history with a sim‑ID) so you can preview the workflow without keys.
      </div>
    </Card>
  );
}
