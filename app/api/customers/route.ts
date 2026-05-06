import { NextRequest, NextResponse } from "next/server";
import { exec } from "@/lib/db";
import { enrollInDripFlows } from "@/lib/drip";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const r = await exec(`
    INSERT INTO customers (name, email, phone, address, birthday, preferences, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `, [body.name, body.email || null, body.phone || null, body.address || null, body.birthday || null, body.preferences || null, body.notes || null]);
  enrollInDripFlows(r.insertId, "new_customer");
  return NextResponse.json({ id: r.insertId });
}
