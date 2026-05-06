import { NextRequest, NextResponse } from "next/server";
import { exec } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const r = await exec(`INSERT INTO expenses (occurred_at, category, amount_cents, vendor, notes) VALUES (?, ?, ?, ?, ?)`,
    [body.occurred_at || new Date().toISOString().slice(0, 10), body.category || "Other", body.amount_cents || 0, body.vendor || null, body.notes || null]);
  return NextResponse.json({ id: r.insertId });
}
