"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function PortalLink({ groupId, token }: { groupId: number; token: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function generate() {
    setBusy(true);
    await fetch(`/api/groups/${groupId}/portal`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  if (!token) {
    return (
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm text-[var(--ink-soft)]">Generate a private link the wedding party can use to add themselves and submit measurements.</div>
        <button onClick={generate} disabled={busy} className="btn btn-primary">{busy ? "…" : "Generate link"}</button>
      </div>
    );
  }

  const url = typeof window !== "undefined" ? `${window.location.origin}/wedding/${token}` : `/wedding/${token}`;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <input className="input mono text-xs flex-1" readOnly value={url} onFocus={(e) => e.currentTarget.select()} />
        <button className="btn" onClick={() => { navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>{copied ? "Copied" : "Copy"}</button>
        <a href={`/wedding/${token}`} target="_blank" rel="noreferrer" className="btn">Preview</a>
      </div>
      <div className="text-xs text-[var(--ink-mute)]">Share with the groom or organizer. Anyone with this link can add themselves to the party.</div>
    </div>
  );
}
