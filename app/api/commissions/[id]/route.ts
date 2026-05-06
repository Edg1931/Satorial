import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const allowed = ["paid_at", "amount_cents", "percent"];
  const sets: string[] = [];
  const values: any[] = [];
  for (const k of allowed) if (k in body) { sets.push(`${k} = ?`); values.push(body[k]); }
  if (!sets.length) return NextResponse.json({ ok: true });
  db().prepare(`UPDATE commissions SET ${sets.join(", ")} WHERE id = ?`).run(...values, Number(params.id));
  return NextResponse.json({ ok: true });
}
