import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { publish } from "@/lib/social/connectors";
import type { SocialConnection } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const conn = db();
  const platforms = (body.platforms || []).join(",");
  const status = body.action === "publish" ? "posted" : body.action === "schedule" ? "scheduled" : "draft";
  const r = conn.prepare(`
    INSERT INTO social_posts (caption, hashtags, media_urls, platforms, status, scheduled_for, posted_at, results, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    body.caption,
    (body.hashtags || []).join(" "),
    (body.media_urls || []).join(" "),
    platforms,
    status,
    body.scheduled_for || null,
    body.action === "publish" ? new Date().toISOString() : null,
    null,
    "user",
  );
  const id = Number(r.lastInsertRowid);

  if (body.action === "publish") {
    const results: any[] = [];
    for (const p of body.platforms || []) {
      const c = conn.prepare("SELECT * FROM social_connections WHERE platform = ?").get(p) as SocialConnection | undefined;
      if (!c) { results.push({ platform: p, ok: false, error: "no connection record" }); continue; }
      const res = await publish(c, {
        caption: body.caption,
        hashtags: body.hashtags || [],
        mediaUrls: body.media_urls || [],
        perPlatform: body.per_platform || {},
      });
      results.push(res);
    }
    conn.prepare("UPDATE social_posts SET results = ? WHERE id = ?").run(JSON.stringify(results), id);
    const anyFail = results.some((r) => !r.ok);
    if (anyFail) conn.prepare("UPDATE social_posts SET status = 'failed' WHERE id = ?").run(id);
  }

  return NextResponse.json({ id });
}
