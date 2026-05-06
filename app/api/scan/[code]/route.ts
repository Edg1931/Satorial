import { NextRequest, NextResponse } from "next/server";
import { one } from "@/lib/db";
import type { Item } from "@/lib/types";

export const runtime = "nodejs";

export async function GET(_req: NextRequest, { params }: { params: { code: string } }) {
  const code = decodeURIComponent(params.code).trim();
  const item = await one<Item>("SELECT * FROM items WHERE barcode = ? OR sku = ?", [code, code]);
  return NextResponse.json({ item: item || null });
}
