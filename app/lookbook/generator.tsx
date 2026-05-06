"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { dollars } from "@/lib/format";
import type { Item } from "@/lib/types";

export default function LookbookGenerator({ item }: { item: Item }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [draft, setDraft] = useState<{ caption: string; hashtags: string[] } | null>(null);

  async function generate() {
    setBusy("gen");
    const r = await fetch("/api/lookbook/generate", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: item.id }),
    });
    const j = await r.json();
    setDraft({ caption: j.caption || "", hashtags: j.hashtags || [] });
    setBusy(null);
  }

  async function save() {
    if (!draft) return;
    setBusy("save");
    await fetch("/api/lookbook", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: item.id, title: item.name, caption: draft.caption, hashtags: draft.hashtags.join(" ") }),
    });
    setBusy(null);
    router.refresh();
  }

  async function pushToSocial() {
    if (!draft) return;
    setBusy("push");
    await fetch("/api/social/posts", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption: draft.caption,
        hashtags: draft.hashtags,
        platforms: ["instagram", "facebook"],
        action: "draft",
      }),
    });
    setBusy(null);
    router.push("/social");
  }

  return (
    <div className="rounded-lg border border-[var(--line-soft)] p-3">
      <div className="text-sm font-medium">{item.name}</div>
      <div className="text-[11px] text-[var(--ink-mute)] mt-0.5">{[item.color, item.size].filter(Boolean).join(" · ")} · {dollars(item.price_cents)}</div>
      {!draft ? (
        <button onClick={generate} disabled={busy !== null} className="btn text-xs w-full mt-2">{busy === "gen" ? "Drafting…" : "✦ Generate"}</button>
      ) : (
        <>
          <textarea rows={4} className="textarea text-xs mt-2" value={draft.caption} onChange={(e) => setDraft({ ...draft, caption: e.target.value })} />
          <input className="input mono text-[11px] mt-1" value={draft.hashtags.join(" ")} onChange={(e) => setDraft({ ...draft, hashtags: e.target.value.split(/\s+/) })} />
          <div className="flex gap-1 mt-2">
            <button onClick={save} disabled={busy !== null} className="btn text-xs flex-1">{busy === "save" ? "…" : "Save"}</button>
            <button onClick={pushToSocial} disabled={busy !== null} className="btn btn-primary text-xs flex-1">{busy === "push" ? "…" : "→ Social"}</button>
          </div>
        </>
      )}
    </div>
  );
}
