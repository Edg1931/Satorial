import { NextRequest, NextResponse } from "next/server";
import { exec } from "@/lib/db";
import { setConfig, cloverPing } from "@/lib/integrations/clover";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { provider: string } }) {
  const provider = params.provider as "clover" | "twilio" | "resend";
  if (!["clover", "twilio", "resend"].includes(provider)) return NextResponse.json({ error: "Unknown provider" }, { status: 400 });
  const body = await req.json();

  let summary = "";
  if (provider === "clover" && body.merchantId && body.apiToken) {
    const ping = await cloverPing({ merchantId: body.merchantId, apiToken: body.apiToken, baseUrl: body.baseUrl });
    if (!ping.ok) {
      await setConfig("clover", body, "error");
      return NextResponse.json({ ok: false, error: ping.error || "Clover verification failed" }, { status: 400 });
    }
    summary = `Verified merchant ${ping.merchantName || body.merchantId}`;
  }
  await setConfig(provider, body, "connected");
  if (summary) await exec("UPDATE integrations SET last_sync_summary = ?, last_sync_at = datetime('now') WHERE provider = ?", [summary, provider]);
  return NextResponse.json({ ok: true, summary });
}

export async function DELETE(_req: NextRequest, { params }: { params: { provider: string } }) {
  await exec("UPDATE integrations SET status = 'disconnected', config = NULL WHERE provider = ?", [params.provider]);
  return NextResponse.json({ ok: true });
}
