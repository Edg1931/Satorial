"use client";
import { useEffect, useRef, useState } from "react";
import { Card } from "@/components/ui";

type Msg = { role: "user" | "assistant"; content: string; actions?: ActionProposal[] };
type ActionProposal = {
  id: string;
  tool: string;
  description: string;
  params: any;
  status?: "pending" | "approved" | "rejected" | "executed" | "failed";
  result?: any;
};

const QUICK_PROMPTS = [
  "What should I reorder this week?",
  "Top sizes & categories selling — recommend a buy plan.",
  "Draft an Instagram post for our new fall arrivals.",
  "Which custom orders are at risk before their event date?",
  "Write a weekly recap email I can send to myself.",
  "Suggest a promotion to clear slow movers.",
];

export default function AIChat() {
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, busy]);

  async function send(text?: string) {
    const message = (text ?? input).trim();
    if (!message) return;
    setInput("");
    setBusy(true);
    const next = [...messages, { role: "user" as const, content: message }];
    setMessages(next);
    try {
      const r = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, history: next.slice(0, -1).map(({ role, content }) => ({ role, content })) }),
      });
      const j = await r.json();
      setMessages((m) => [...m, { role: "assistant", content: j.text || "(no response)", actions: j.actions }]);
    } catch (e: any) {
      setMessages((m) => [...m, { role: "assistant", content: `Error: ${e?.message || "request failed"}` }]);
    }
    setBusy(false);
  }

  async function approveAction(idx: number, actionId: string) {
    const msg = messages[idx];
    const action = msg.actions?.find((a) => a.id === actionId);
    if (!action) return;
    setMessages((all) => all.map((m, i) => i !== idx ? m : { ...m, actions: m.actions?.map((a) => a.id === actionId ? { ...a, status: "approved" } : a) }));
    const r = await fetch("/api/ai/execute", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ tool: action.tool, params: action.params }) });
    const j = await r.json();
    setMessages((all) => all.map((m, i) => i !== idx ? m : { ...m, actions: m.actions?.map((a) => a.id === actionId ? { ...a, status: r.ok ? "executed" : "failed", result: j } : a) }));
  }

  function rejectAction(idx: number, actionId: string) {
    setMessages((all) => all.map((m, i) => i !== idx ? m : { ...m, actions: m.actions?.map((a) => a.id === actionId ? { ...a, status: "rejected" } : a) }));
  }

  return (
    <div className="grid lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <Card>
          <div ref={scrollRef} className="h-[60vh] overflow-y-auto scrollbar pr-2 space-y-4">
            {messages.length === 0 && (
              <div className="grid sm:grid-cols-2 gap-2">
                {QUICK_PROMPTS.map((p) => (
                  <button key={p} className="text-left rounded-lg border border-[var(--line-soft)] p-3 hover:border-[var(--accent)] text-sm" onClick={() => send(p)}>{p}</button>
                ))}
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={m.role === "user" ? "flex justify-end" : "flex justify-start"}>
                <div className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm ${m.role === "user" ? "bg-[var(--accent)] text-[#1a1408]" : "bg-[var(--bg-elev-2)] border border-[var(--line-soft)]"}`}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                  {m.actions && m.actions.length > 0 && (
                    <div className="mt-3 space-y-2">
                      {m.actions.map((a) => (
                        <div key={a.id} className="rounded-lg border border-[var(--line)] bg-[var(--bg)] p-3">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs uppercase tracking-wider text-[var(--accent-soft)]">Proposed action · {a.tool}</div>
                            {a.status && a.status !== "pending" && (
                              <span className={`chip ${a.status === "executed" ? "chip-good" : a.status === "failed" ? "chip-bad" : "chip-warn"}`}>{a.status}</span>
                            )}
                          </div>
                          <div className="text-sm mt-1 text-[var(--ink)]">{a.description}</div>
                          <pre className="mono text-[11px] text-[var(--ink-mute)] mt-1 max-h-24 overflow-auto scrollbar">{JSON.stringify(a.params, null, 2)}</pre>
                          {(!a.status || a.status === "pending") && (
                            <div className="flex gap-2 mt-2">
                              <button className="btn btn-primary text-xs" onClick={() => approveAction(i, a.id)}>Approve</button>
                              <button className="btn text-xs" onClick={() => rejectAction(i, a.id)}>Skip</button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {busy && (
              <div className="flex"><div className="rounded-2xl px-4 py-3 bg-[var(--bg-elev-2)] border border-[var(--line-soft)] text-sm text-[var(--ink-mute)]">Thinking…</div></div>
            )}
          </div>
          <form onSubmit={(e) => { e.preventDefault(); send(); }} className="mt-4 flex gap-2">
            <input className="input flex-1" placeholder="Ask the AI Partner — reorder calls, copy, recaps, anything." value={input} onChange={(e) => setInput(e.target.value)} />
            <button disabled={busy} className="btn btn-primary">{busy ? "…" : "Send"}</button>
          </form>
        </Card>
      </div>

      <div className="lg:col-span-1 space-y-4">
        <Card title="What I can help with">
          <ul className="text-sm text-[var(--ink-soft)] space-y-2">
            <li>📦 <span className="text-[var(--ink)]">Inventory</span> — reorders, slow movers, allocation</li>
            <li>📈 <span className="text-[var(--ink)]">Sales</span> — size mix, attach-rate plays</li>
            <li>📅 <span className="text-[var(--ink)]">Operations</span> — at-risk orders, group/wedding parties</li>
            <li>💰 <span className="text-[var(--ink)]">Finance</span> — margin, deposits, promo math</li>
            <li>🪡 <span className="text-[var(--ink)]">Marketing</span> — emails, captions, calendars</li>
            <li>📣 <span className="text-[var(--ink)]">Social</span> — IG/FB/X/TikTok/LinkedIn drafts</li>
          </ul>
        </Card>
        <Card title="Action approvals">
          <div className="text-sm text-[var(--ink-soft)]">When the AI proposes a write action — adjusting stock, drafting a social post, marking an order ready — you'll see an Approve / Skip card. Nothing changes without your tap.</div>
        </Card>
      </div>
    </div>
  );
}
