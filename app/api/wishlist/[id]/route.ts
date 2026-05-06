import { NextRequest, NextResponse } from "next/server";
import { exec } from "@/lib/db";
export const runtime = "nodejs";
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  await exec("DELETE FROM wishlist WHERE id = ?", [Number(params.id)]);
  return NextResponse.json({ ok: true });
}
