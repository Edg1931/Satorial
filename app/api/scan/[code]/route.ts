import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { Item } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code).trim();
  const conn = db();
  const item = conn.prepare(`SELECT * FROM items WHERE barcode = ? OR sku = ?`).get(code, code) as Item | undefined;
  return NextResponse.json({ item: item || null });
}
