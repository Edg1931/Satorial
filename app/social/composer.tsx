"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SocialConnection, SocialPlatform } from "@/lib/types";
import { Card } from "@/components/ui";
import { PLATFORM_META } from "@/lib/social/connectors";

export default function Composer({ connections }: { connections: SocialConnection[] }) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [tone, setTone] = useState("");
  const [platforms, setPlatforms] = useState<SocialPlatform[]>(["instagram", "facebook"]);
  const [caption, setCaption] = useState("");
  const [hashtags, setHashtags] = useState("");
  const [media, setMedia] = useState("");
  const [perPlatform, setPerPlatform] = useState<Record<string, string>>({});
  const [scheduledFor, setScheduledFor] = useState("");
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  function togglePlatform(p: SocialPlatform) {
    setPlatforms((cur) => (cur.includes(p) ? cur.filter((x) => x !== p) : [...cur, p]));
  }

  async function generate() {
    if (!prompt.trim()) { setMsg("Enter a brief first."); return; }
    setBusy("generate");
    setMsg(null);
    try {
      const r = await fetch("/api/social/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt, tone, platforms }),
      });
      const j = await r.json();
      setCaption(j.caption || "");
      setHashtags((j.hashtags || []).join(" "));
      setPerPlatform(j.perPlatform || {});
    } catch (e: any) { setMsg(e?.message || "AI failed"); }
    setBusy(null);
  }

  async function save(action: "draft" | "schedule" | "publish") {
    if (!caption.trim()) { setMsg("Write or generate a caption."); return; }
    if (action === "schedule" && !scheduledFor) { setMsg("Pick a schedule date/time."); return; }
    setBusy(action);
    setMsg(null);
    const r = await fetch("/api/social/posts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        caption,
        hashtags: hashtags.split(/\s+/).filter(Boolean),
        media_urls: media.split(/\s+/).filter(Boolean),
        platforms,
        per_platform: perPlatform,
        action,
        scheduled_for: scheduledFor || null,
      }),
    });
    const j = await r.json().catch(() => ({}));
    setBusy(null);
    if (r.ok) {
      setMsg(action === "publish" ? "Posted." : action === "schedule" ? "Scheduled." : "Saved as draft.");
      router.refresh();
    } else {
      setMsg(j.error || "Failed");
    }
  }

  return (
    <Card title="Composer">
      <div className="space-y-4">
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Brief / topic for AI">
            <textarea rows={2} className="textarea" placeholder="e.g. New navy double-breasted suit drop, in stores Friday" value={prompt} onChange={(e) => setPrompt(e.target.value)} />
          </Field>
          <Field label="Tone (optional)">
            <input className="input" placeholder="e.g. confident, understated, witty" value={tone} onChange={(e) => setTone(e.target.value)} />
          </Field>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {(Object.keys(PLATFORM_META) as SocialPlatform[]).map((p) => {
            const isOn = platforms.includes(p);
            const conn = connections.find((c) => c.platform === p);
            return (
              <button
                key={p}
                type="button"
                onClick={() => togglePlatform(p)}
                className={`chip transition ${isOn ? "chip-accent" : ""} ${conn?.status !== "connected" ? "opacity-70" : ""}`}
                title={conn?.status === "connected" ? `Connected as ${conn.account_handle || ""}` : "Not connected — will simulate"}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: PLATFORM_META[p].color }} />
                {PLATFORM_META[p].label}
                {conn?.status !== "connected" && <span className="text-[10px] opacity-70 ml-1">(sim)</span>}
              </button>
            );
          })}
          <button type="button" onClick={generate} disabled={busy !== null} className="btn ml-auto">
            ✦ {busy === "generate" ? "Drafting…" : "AI draft"}
          </button>
        </div>

        <Field label="Caption">
          <textarea rows={5} className="textarea" value={caption} onChange={(e) => setCaption(e.target.value)} />
        </Field>
        <div className="grid md:grid-cols-2 gap-3">
          <Field label="Hashtags (space separated)">
            <input className="input" value={hashtags} onChange={(e) => setHashtags(e.target.value)} />
          </Field>
          <Field label="Media URLs (one per line, used by IG/FB)">
            <input className="input" placeholder="https://…" value={media} onChange={(e) => setMedia(e.target.value)} />
          </Field>
        </div>

        {Object.keys(perPlatform).length > 0 && (
          <details className="rounded-lg border border-[var(--line-soft)] p-3">
            <summary className="cursor-pointer text-sm">Per-platform overrides</summary>
            <div className="grid md:grid-cols-2 gap-3 mt-3">
              {platforms.map((p) => (
                <Field key={p} label={PLATFORM_META[p].label}>
                  <textarea rows={3} className="textarea" value={perPlatform[p] || ""} onChange={(e) => setPerPlatform((s) => ({ ...s, [p]: e.target.value }))} />
                </Field>
              ))}
            </div>
          </details>
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Field label="Schedule for (optional)">
            <input type="datetime-local" className="input" value={scheduledFor} onChange={(e) => setScheduledFor(e.target.value)} />
          </Field>
          <div className="ml-auto flex items-center gap-2">
            <button type="button" disabled={busy !== null} className="btn" onClick={() => save("draft")}>{busy === "draft" ? "Saving…" : "Save draft"}</button>
            <button type="button" disabled={busy !== null} className="btn" onClick={() => save("schedule")}>{busy === "schedule" ? "Scheduling…" : "Schedule"}</button>
            <button type="button" disabled={busy !== null} className="btn btn-primary" onClick={() => save("publish")}>{busy === "publish" ? "Posting…" : "Post now"}</button>
          </div>
        </div>
        {msg && <div className="text-sm text-[var(--ink-soft)]">{msg}</div>}
      </div>
    </Card>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><div className="label mb-1.5">{label}</div>{children}</label>;
}
