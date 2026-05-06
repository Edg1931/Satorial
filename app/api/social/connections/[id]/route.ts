import { NextRequest, NextResponse } from "next/server";
import { exec } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const allowed = ["account_handle", "account_id", "access_token", "refresh_token", "expires_at", "status"];
  const sets: string[] = [];
  const values: any[] = [];
  for (const k of allowed) if (k in body) { sets.push(`${k} = ?`); values.push(body[k]); }
  if (body.status === "connected") { sets.push("connected_at = datetime('now')"); }
  if (!sets.length) return NextResponse.json({ ok: true });
  await exec(`UPDATE social_connections SET ${sets.join(", ")} WHERE id = ?`, [...values, Number(params.id)]);
  return NextResponse.json({ ok: true });
}
