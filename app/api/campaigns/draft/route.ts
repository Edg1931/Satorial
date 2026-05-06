import { NextRequest, NextResponse } from "next/server";
import { aiEnabled } from "@/lib/ai";
import Anthropic from "@anthropic-ai/sdk";

export const runtime = "nodejs";
export const maxDuration = 30;

const MODEL = process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";

export async function POST(req: NextRequest) {
  const { prompt, channel } = await req.json();
  if (!aiEnabled()) {
    if (channel === "sms") {
      return NextResponse.json({ subject: "", body: `Hi {{first_name}}, ${prompt} — Satorial.` });
    }
    return NextResponse.json({ subject: prompt, body: `Hi {{first_name}},\n\n${prompt}\n\n— Satorial` });
  }
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const sys = channel === "sms"
    ? `Write a single SMS for a luxury menswear shop. Under 320 chars. Use {{first_name}} token. No emoji. Return JSON: {"body":string}`
    : `Write a marketing email for Satorial, a refined men's retail/tailoring brand. Voice: confident, sartorial. Use {{first_name}} and {{shop_name}} tokens. Return JSON: {"subject":string,"body":string}`;
  const r = await client.messages.create({
    model: MODEL,
    max_tokens: 800,
    system: sys,
    messages: [{ role: "user", content: prompt }],
  });
  const text = r.content.filter((b) => b.type === "text").map((b: any) => b.text).join("");
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  let json: any = {};
  try { json = JSON.parse(text.slice(start, end + 1)); } catch {}
  return NextResponse.json({ subject: json.subject || "", body: json.body || text });
}
