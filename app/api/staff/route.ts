import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const r = db().prepare(`INSERT INTO staff (name, email, phone, role, pin) VALUES (?, ?, ?, ?, ?)`).run(body.name, body.email || null, body.phone || null, body.role || "sales", body.pin || null);
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
