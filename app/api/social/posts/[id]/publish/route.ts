import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publish } from "@/lib/social/connectors";
import type { SocialConnection, SocialPost } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const conn = db();
  const post = conn.prepare("SELECT * FROM social_posts WHERE id = ?").get(Number(params.id)) as SocialPost | undefined;
  if (!post) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const platforms = post.platforms.split(",").filter(Boolean);
  const results: any[] = [];
  for (const p of platforms) {
    const c = conn.prepare("SELECT * FROM social_connections WHERE platform = ?").get(p) as SocialConnection | undefined;
    if (!c) { results.push({ platform: p, ok: false, error: "no connection" }); continue; }
    const res = await publish(c, {
      caption: post.caption,
      hashtags: post.hashtags ? post.hashtags.split(/\s+/).filter(Boolean) : [],
      mediaUrls: post.media_urls ? post.media_urls.split(/\s+/).filter(Boolean) : [],
    });
    results.push(res);
  }
  const anyFail = results.some((r) => !r.ok);
  conn.prepare("UPDATE social_posts SET status = ?, posted_at = ?, results = ? WHERE id = ?")
    .run(anyFail ? "failed" : "posted", new Date().toISOString(), JSON.stringify(results), post.id);
  return NextResponse.redirect(new URL("/social", _req.url));
}
