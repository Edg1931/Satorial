import { NextRequest, NextResponse } from "next/server";
import { many } from "@/lib/db";
export const runtime = "nodejs";
export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") || "";
  if (!q) return NextResponse.json([]);
  const rows = await many(`SELECT id, sku, name, color, size, quantity, price_cents FROM items WHERE name LIKE ? OR sku LIKE ? OR color LIKE ? OR size LIKE ? ORDER BY name LIMIT 12`, [`%${q}%`, `%${q}%`, `%${q}%`, `%${q}%`]);
  return NextResponse.json(rows);
}
