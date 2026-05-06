import type { SocialConnection, SocialPlatform } from "../types";

export type PublishInput = {
  caption: string;
  hashtags?: string[];
  mediaUrls?: string[];
  perPlatform?: Record<string, string>;
};

export type PublishResult = {
  platform: SocialPlatform;
  ok: boolean;
  simulated: boolean;
  remoteId?: string;
  url?: string;
  error?: string;
};

function compose(input: PublishInput, platform: SocialPlatform): string {
  const tailored = input.perPlatform?.[platform];
  if (tailored) return tailored;
  const tags = (input.hashtags || []).join(" ");
  return tags ? `${input.caption}\n\n${tags}` : input.caption;
}

async function postInstagram(c: SocialConnection, input: PublishInput): Promise<PublishResult> {
  const text = compose(input, "instagram");
  const media = input.mediaUrls?.[0];
  if (!c.access_token || !c.account_id) {
    return { platform: "instagram", ok: true, simulated: true, remoteId: `sim-ig-${Date.now()}` };
  }
  if (!media) {
    return { platform: "instagram", ok: false, simulated: false, error: "Instagram requires at least one media URL" };
  }
  try {
    const create = await fetch(
      `https://graph.facebook.com/v19.0/${c.account_id}/media?image_url=${encodeURIComponent(media)}&caption=${encodeURIComponent(text)}&access_token=${c.access_token}`,
      { method: "POST" },
    );
    const createJson = await create.json();
    if (!create.ok || !createJson.id) throw new Error(createJson.error?.message || "media create failed");
    const pub = await fetch(
      `https://graph.facebook.com/v19.0/${c.account_id}/media_publish?creation_id=${createJson.id}&access_token=${c.access_token}`,
      { method: "POST" },
    );
    const pubJson = await pub.json();
    if (!pub.ok || !pubJson.id) throw new Error(pubJson.error?.message || "publish failed");
    return { platform: "instagram", ok: true, simulated: false, remoteId: pubJson.id };
  } catch (e: any) {
    return { platform: "instagram", ok: false, simulated: false, error: e?.message || String(e) };
  }
}

async function postFacebook(c: SocialConnection, input: PublishInput): Promise<PublishResult> {
  const text = compose(input, "facebook");
  if (!c.access_token || !c.account_id) {
    return { platform: "facebook", ok: true, simulated: true, remoteId: `sim-fb-${Date.now()}` };
  }
  try {
    const url = input.mediaUrls?.[0]
      ? `https://graph.facebook.com/v19.0/${c.account_id}/photos`
      : `https://graph.facebook.com/v19.0/${c.account_id}/feed`;
    const params = new URLSearchParams({ access_token: c.access_token, message: text });
    if (input.mediaUrls?.[0]) params.set("url", input.mediaUrls[0]);
    const r = await fetch(url, { method: "POST", body: params });
    const j = await r.json();
    if (!r.ok || !(j.id || j.post_id)) throw new Error(j.error?.message || "fb post failed");
    return { platform: "facebook", ok: true, simulated: false, remoteId: j.id || j.post_id };
  } catch (e: any) {
    return { platform: "facebook", ok: false, simulated: false, error: e?.message || String(e) };
  }
}

async function postX(c: SocialConnection, input: PublishInput): Promise<PublishResult> {
  const text = compose(input, "x").slice(0, 280);
  if (!c.access_token) {
    return { platform: "x", ok: true, simulated: true, remoteId: `sim-x-${Date.now()}` };
  }
  try {
    const r = await fetch("https://api.twitter.com/2/tweets", {
      method: "POST",
      headers: { Authorization: `Bearer ${c.access_token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
    const j = await r.json();
    if (!r.ok || !j.data?.id) throw new Error(j.errors?.[0]?.message || j.detail || "x post failed");
    return { platform: "x", ok: true, simulated: false, remoteId: j.data.id, url: `https://x.com/i/status/${j.data.id}` };
  } catch (e: any) {
    return { platform: "x", ok: false, simulated: false, error: e?.message || String(e) };
  }
}

async function postLinkedIn(c: SocialConnection, input: PublishInput): Promise<PublishResult> {
  const text = compose(input, "linkedin");
  if (!c.access_token || !c.account_id) {
    return { platform: "linkedin", ok: true, simulated: true, remoteId: `sim-li-${Date.now()}` };
  }
  try {
    const r = await fetch("https://api.linkedin.com/v2/ugcPosts", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${c.access_token}`,
        "Content-Type": "application/json",
        "X-Restli-Protocol-Version": "2.0.0",
      },
      body: JSON.stringify({
        author: `urn:li:person:${c.account_id}`,
        lifecycleState: "PUBLISHED",
        specificContent: {
          "com.linkedin.ugc.ShareContent": {
            shareCommentary: { text },
            shareMediaCategory: "NONE",
          },
        },
        visibility: { "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" },
      }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error(j.message || "linkedin post failed");
    return { platform: "linkedin", ok: true, simulated: false, remoteId: j.id };
  } catch (e: any) {
    return { platform: "linkedin", ok: false, simulated: false, error: e?.message || String(e) };
  }
}

async function postTikTok(c: SocialConnection, input: PublishInput): Promise<PublishResult> {
  if (!c.access_token) {
    return { platform: "tiktok", ok: true, simulated: true, remoteId: `sim-tt-${Date.now()}` };
  }
  return {
    platform: "tiktok",
    ok: false,
    simulated: false,
    error: "TikTok publishing requires a video upload flow. Connect your TikTok app and provide a hosted video URL.",
  };
}

export async function publish(connection: SocialConnection, input: PublishInput): Promise<PublishResult> {
  switch (connection.platform) {
    case "instagram": return postInstagram(connection, input);
    case "facebook": return postFacebook(connection, input);
    case "x": return postX(connection, input);
    case "linkedin": return postLinkedIn(connection, input);
    case "tiktok": return postTikTok(connection, input);
    default: return { platform: connection.platform, ok: false, simulated: false, error: "Unknown platform" };
  }
}

export const PLATFORM_META: Record<SocialPlatform, { label: string; color: string; supportsText: boolean; supportsImage: boolean; supportsVideo: boolean; charLimit?: number; oauthDocs: string }> = {
  instagram: { label: "Instagram", color: "#E1306C", supportsText: true, supportsImage: true, supportsVideo: true, oauthDocs: "https://developers.facebook.com/docs/instagram-api" },
  facebook: { label: "Facebook", color: "#1877F2", supportsText: true, supportsImage: true, supportsVideo: true, oauthDocs: "https://developers.facebook.com/docs/pages-api" },
  x: { label: "X / Twitter", color: "#0e1014", supportsText: true, supportsImage: true, supportsVideo: false, charLimit: 280, oauthDocs: "https://developer.x.com/en/docs" },
  tiktok: { label: "TikTok", color: "#000000", supportsText: false, supportsImage: false, supportsVideo: true, oauthDocs: "https://developers.tiktok.com/doc/login-kit-web" },
  linkedin: { label: "LinkedIn", color: "#0A66C2", supportsText: true, supportsImage: true, supportsVideo: true, oauthDocs: "https://learn.microsoft.com/en-us/linkedin/marketing/" },
};
