import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const allowed = ["stage", "status", "appointment_date", "event_date", "garment_expected_date", "garment_delivered_date", "rental_pickup_date", "rental_return_date", "rental_state", "deposit_cents", "total_cents", "balance_cents", "notes", "garment_description", "fabric", "style_notes"];
  const sets: string[] = [];
  const values: any[] = [];
  for (const k of allowed) if (k in body) { sets.push(`${k} = ?`); values.push(body[k]); }
  if (!sets.length) return NextResponse.json({ ok: true });
  sets.push(`updated_at = datetime('now')`);
  db().prepare(`UPDATE appointments SET ${sets.join(", ")} WHERE id = ?`).run(...values, Number(params.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  db().prepare("DELETE FROM appointments WHERE id = ?").run(Number(params.id));
  return NextResponse.json({ ok: true });
}
