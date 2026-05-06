import { NextRequest, NextResponse } from "next/server";
import { exec, one } from "@/lib/db";
import { getConfig, cloverAdjustStock } from "@/lib/integrations/clover";
import { notifyWishlistForItem } from "@/lib/wishlist";
import type { Item } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const { delta } = await req.json();
  const id = Number(params.id);
  const item = await one<Item>("SELECT * FROM items WHERE id = ?", [id]);
  if (!item) return NextResponse.json({ error: "Not found" }, { status: 404 });
  const wasOut = item.quantity === 0;
  const next = Math.max(0, Number(item.quantity) + Number(delta || 0));
  await exec("UPDATE items SET quantity = ?, updated_at = datetime('now') WHERE id = ?", [next, id]);

  const cfg = await getConfig("clover");
  if (cfg) cloverAdjustStock(cfg as any, item.sku, Number(delta || 0)).catch(() => {});

  if (wasOut && next > 0) notifyWishlistForItem(item.id).catch(() => {});

  return NextResponse.json({ ok: true, quantity: next });
}
