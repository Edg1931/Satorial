import { NextRequest, NextResponse } from "next/server";
import { getConfig, cloverPullInventory } from "@/lib/integrations/clover";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(_req: NextRequest) {
  const cfg = getConfig("clover");
  if (!cfg) return NextResponse.json({ error: "Clover not configured" }, { status: 400 });
  const r = await cloverPullInventory(cfg as any);
  return NextResponse.json(r);
}
