import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
export const runtime = "nodejs";
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  db().prepare("DELETE FROM wishlist WHERE id = ?").run(Number(params.id));
  return NextResponse.json({ ok: true });
}
