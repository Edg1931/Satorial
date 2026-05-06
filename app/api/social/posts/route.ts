import { NextRequest, NextResponse } from "next/server";
import { exec, one } from "@/lib/db";
import { publish } from "@/lib/social/connectors";
import type { SocialConnection } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const platforms = (body.platforms || []).join(",");
  const status = body.action === "publish" ? "posted" : body.action === "schedule" ? "scheduled" : "draft";
  const r = await exec(`
    INSERT INTO social_posts (caption, hashtags, media_urls, platforms, status, scheduled_for, posted_at, results, created_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    body.caption,
    (body.hashtags || []).join(" "),
    (body.media_urls || []).join(" "),
    platforms,
    status,
    body.scheduled_for || null,
    body.action === "publish" ? new Date().toISOString() : null,
    null,
    "user",
  ]);
  const id = r.insertId;

  if (body.action === "publish") {
    const results: any[] = [];
    for (const p of body.platforms || []) {
      const c = await one<SocialConnection>("SELECT * FROM social_connections WHERE platform = ?", [p]);
      if (!c) { results.push({ platform: p, ok: false, error: "no connection record" }); continue; }
      const res = await publish(c, {
        caption: body.caption,
        hashtags: body.hashtags || [],
        mediaUrls: body.media_urls || [],
        perPlatform: body.per_platform || {},
      });
      results.push(res);
    }
    await exec("UPDATE social_posts SET results = ? WHERE id = ?", [JSON.stringify(results), id]);
    const anyFail = results.some((r) => !r.ok);
    if (anyFail) await exec("UPDATE social_posts SET status = 'failed' WHERE id = ?", [id]);
  }

  return NextResponse.json({ id });
}
