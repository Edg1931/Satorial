import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const body = await req.json();
  const r = db().prepare(`INSERT INTO lookbook (item_id, style_id, title, caption, hashtags, image_url) VALUES (?, ?, ?, ?, ?, ?)`)
    .run(body.item_id || null, body.style_id || null, body.title, body.caption, body.hashtags || null, body.image_url || null);
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
