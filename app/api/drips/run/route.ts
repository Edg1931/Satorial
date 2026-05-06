import { NextRequest, NextResponse } from "next/server";
import { runDripQueue } from "@/lib/drip";
export const runtime = "nodejs";
export const maxDuration = 120;
export async function POST(_req: NextRequest) {
  const r = await runDripQueue();
  return NextResponse.json(r);
}
