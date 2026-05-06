import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { generateSocialPost } from "@/lib/ai";
import type { Item } from "@/lib/types";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: NextRequest) {
  const { item_id } = await req.json();
  const item = db().prepare("SELECT * FROM items WHERE id = ?").get(item_id) as Item | undefined;
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const prompt = `Look book post for: ${item.name}. ${item.material || ""} in ${item.color || ""}, size ${item.size || "OS"}. Category: ${item.category}. Highlight craft, fabric, fit. End with a refined CTA to visit or DM for fitting.`;
  const out = await generateSocialPost({ prompt, platforms: ["instagram", "facebook"], tone: "sartorial, confident, understated" });
  return NextResponse.json(out);
}
