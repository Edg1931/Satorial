import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const id = Number(params.id);
  const allowed = ["name", "category", "color", "size", "material", "cost_cents", "price_cents", "quantity", "reorder_point", "supplier", "location", "is_rental", "notes"];
  const sets: string[] = [];
  const values: any[] = [];
  for (const k of allowed) if (k in body) { sets.push(`${k} = ?`); values.push(body[k]); }
  if (!sets.length) return NextResponse.json({ ok: true });
  sets.push(`updated_at = datetime('now')`);
  db().prepare(`UPDATE items SET ${sets.join(", ")} WHERE id = ?`).run(...values, id);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  db().prepare("DELETE FROM items WHERE id = ?").run(Number(params.id));
  return NextResponse.json({ ok: true });
}
