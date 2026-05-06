import { NextRequest, NextResponse } from "next/server";
import { exec } from "@/lib/db";
export const runtime = "nodejs";
export async function PATCH(req: NextRequest, { params }: { params: { id: string; empId: string } }) {
  const body = await req.json();
  const allowed = ["name", "email", "phone", "role", "stipend_balance_cents"];
  const sets: string[] = [];
  const values: any[] = [];
  for (const k of allowed) if (k in body) { sets.push(`${k} = ?`); values.push(body[k]); }
  if (!sets.length) return NextResponse.json({ ok: true });
  await exec(`UPDATE corporate_employees SET ${sets.join(", ")} WHERE id = ?`, [...values, Number(params.empId)]);
  return NextResponse.json({ ok: true });
}
export async function DELETE(_req: NextRequest, { params }: { params: { id: string; empId: string } }) {
  await exec("DELETE FROM corporate_employees WHERE id = ?", [Number(params.empId)]);
  return NextResponse.json({ ok: true });
}
