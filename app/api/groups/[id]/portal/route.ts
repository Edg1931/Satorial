import { NextRequest, NextResponse } from "next/server";
import crypto from "node:crypto";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
  const conn = db();
  const groupId = Number(params.id);
  const existing = conn.prepare("SELECT token FROM wedding_portals WHERE group_order_id = ?").get(groupId) as { token: string } | undefined;
  if (existing) return NextResponse.json({ token: existing.token });
  const token = crypto.randomBytes(12).toString("hex");
  conn.prepare("INSERT INTO wedding_portals (group_order_id, token) VALUES (?, ?)").run(groupId, token);
  return NextResponse.json({ token });
}
