import Link from "next/link";
import { many } from "@/lib/db";
import { Card, Chip, PageHeader, Stat } from "@/components/ui";
import { shortDateTime } from "@/lib/format";
import type { SocialConnection, SocialPost } from "@/lib/types";
import Composer from "./composer";
import ConnectionList from "./connections";
import { PLATFORM_META } from "@/lib/social/connectors";

export const dynamic = "force-dynamic";

export default async function SocialPage() {
  const connections = await many<SocialConnection>("SELECT * FROM social_connections ORDER BY platform");
  const posts = await many<SocialPost>("SELECT * FROM social_posts ORDER BY created_at DESC LIMIT 20");

  const scheduled = posts.filter((p) => p.status === "scheduled").length;
  const posted = posts.filter((p) => p.status === "posted").length;
  const drafts = posts.filter((p) => p.status === "draft").length;
  const connected = connections.filter((c) => c.status === "connected").length;

  return (
    <>
      <PageHeader
        eyebrow="Marketing"
        title="Social Hub"
        subtitle="One composer. Five platforms. AI-drafted captions and on-brand voice. Schedule or send now."
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <Stat label="Channels connected" value={`${connected} / ${connections.length}`} />
        <Stat label="Scheduled" value={scheduled} />
        <Stat label="Drafts" value={drafts} />
        <Stat label="Posted (last 20)" value={posted} />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <Composer connections={connections} />
        </div>
        <div className="lg:col-span-2">
          <ConnectionList connections={connections} />
        </div>
      </div>

      <Card title="Recent posts" className="mt-6">
        {posts.length === 0 ? (
          <div className="text-sm text-[var(--ink-mute)]">No posts yet — your first one's just a click away.</div>
        ) : (
          <table className="table">
            <thead><tr><th>When</th><th>Platforms</th><th>Caption</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {posts.map((p) => {
                const platforms = p.platforms.split(",").filter(Boolean);
                return (
                  <tr key={p.id}>
                    <td>{shortDateTime(p.posted_at || p.scheduled_for || p.created_at)}</td>
                    <td>
                      <div className="flex gap-1">
                        {platforms.map((pl) => <span key={pl} className="chip" style={{ borderColor: PLATFORM_META[pl as keyof typeof PLATFORM_META]?.color, color: PLATFORM_META[pl as keyof typeof PLATFORM_META]?.color }}>{PLATFORM_META[pl as keyof typeof PLATFORM_META]?.label || pl}</span>)}
                      </div>
                    </td>
                    <td className="max-w-[420px] truncate" title={p.caption}>{p.caption}</td>
                    <td><Chip tone={p.status === "posted" ? "good" : p.status === "failed" ? "bad" : p.status === "scheduled" ? "accent" : undefined}>{p.status}</Chip></td>
                    <td className="text-right">
                      {p.status === "draft" || p.status === "scheduled" ? (
                        <form action={`/api/social/posts/${p.id}/publish`} method="post" className="inline">
                          <button className="btn text-xs">Post now</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </Card>
    </>
  );
}
