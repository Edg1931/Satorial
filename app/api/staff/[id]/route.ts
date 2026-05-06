import { NextRequest, NextResponse } from "next/server";
import { exec } from "@/lib/db";

export const runtime = "nodejs";

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const body = await req.json();
  const allowed = ["name", "email", "phone", "role", "pin", "active", "commission_percent"];
  const sets: string[] = [];
  const values: any[] = [];
  for (const k of allowed) if (k in body) { sets.push(`${k} = ?`); values.push(body[k]); }
  if (!sets.length) return NextResponse.json({ ok: true });
  await exec(`UPDATE staff SET ${sets.join(", ")} WHERE id = ?`, [...values, Number(params.id)]);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await exec("DELETE FROM staff WHERE id = ?", [Number(params.id)]);
  return NextResponse.json({ ok: true });
}
