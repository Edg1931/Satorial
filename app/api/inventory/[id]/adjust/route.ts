import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getConfig, cloverAdjustStock } from "@/lib/integrations/clover";
import { notifyWishlistForItem } from "@/lib/wishlist";
import type { Item } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { delta } = await req.json();
  const id = Number(params.id);
  const conn = db();
  const item = conn.prepare("SELECT * FROM items WHERE id = ?").get(id) as Item | undefined;
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const wasOut = item.quantity === 0;
  const next = Math.max(0, item.quantity + Number(delta || 0));
  conn.prepare("UPDATE items SET quantity = ?, updated_at = datetime('now') WHERE id = ?").run(next, id);

  const cfg = getConfig("clover");
  if (cfg) cloverAdjustStock(cfg as any, item.sku, Number(delta || 0)).catch(() => {});

  if (wasOut && next > 0) notifyWishlistForItem(item.id).catch(() => {});

  return NextResponse.json({ ok: true, quantity: next });
}
