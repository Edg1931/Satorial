import { NextRequest, NextResponse } from "next/server";
import { generateSocialPost } from "@/lib/ai";

export const runtime = "nodejs";
export const maxDuration = 45;

export async function POST(req: NextRequest) {
  const body = await req.json();
  const out = await generateSocialPost({ prompt: body.prompt, platforms: body.platforms || ["instagram"], tone: body.tone });
  return NextResponse.json(out);
}
