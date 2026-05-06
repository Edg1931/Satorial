import { NextRequest, NextResponse } from "next/server";
import { exec } from "@/lib/db";
export const runtime = "nodejs";
export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });
  const r = await exec(`
    INSERT INTO corporate_accounts (name, contact_name, contact_email, contact_phone, billing_email, stipend_cents, stipend_period, notes)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [body.name, body.contact_name || null, body.contact_email || null, body.contact_phone || null, body.billing_email || null, body.stipend_cents || 0, body.stipend_period || "annual", body.notes || null]);
  return NextResponse.json({ id: r.insertId });
}
