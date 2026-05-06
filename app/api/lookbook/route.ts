import { NextRequest, NextResponse } from "next/server";
import { exec } from "@/lib/db";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const body = await req.json();
  const r = await exec(`INSERT INTO lookbook (item_id, style_id, title, caption, hashtags, image_url) VALUES (?, ?, ?, ?, ?, ?)`,
    [body.item_id || null, body.style_id || null, body.title, body.caption, body.hashtags || null, body.image_url || null]);
  return NextResponse.json({ id: r.insertId });
}
