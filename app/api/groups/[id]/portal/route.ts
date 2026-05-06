import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { exec, one } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const groupId = Number(params.id);
  const existing = await one<{ token: string }>("SELECT token FROM wedding_portals WHERE group_order_id = ?", [groupId]);
  if (existing) return NextResponse.json({ token: existing.token });
  const token = crypto.randomBytes(12).toString("hex");
  await exec("INSERT INTO wedding_portals (group_order_id, token) VALUES (?, ?)", [groupId, token]);
  return NextResponse.json({ token });
}
