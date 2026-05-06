import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import type { GroupOrder } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const conn = db();
  const portal = conn.prepare("SELECT group_order_id FROM wedding_portals WHERE token = ?").get(params.token) as { group_order_id: number } | undefined;
  if (!portal) return NextResponse.json({ error: "Invalid link" }, { status: 404 });
  const group = conn.prepare("SELECT * FROM group_orders WHERE id = ?").get(portal.group_order_id) as GroupOrder | undefined;
  if (!group) return NextResponse.json({ error: "Group not found" }, { status: 404 });

  const body = await req.json();
  if (!body.name) return NextResponse.json({ error: "name required" }, { status: 400 });

  const tx = conn.transaction(() => {
    const c = conn.prepare("INSERT INTO customers (name, email, phone, notes) VALUES (?, ?, ?, ?)")
      .run(body.name, body.email || null, body.phone || null, body.notes ? `Wedding party intake: ${body.notes}` : null);
    const customerId = Number(c.lastInsertRowid);

    if (body.measurements && Object.keys(body.measurements).length > 0) {
      const cols = ["customer_id", "taken_by", ...Object.keys(body.measurements)];
      const placeholders = cols.map(() => "?").join(",");
      const values = [customerId, "Self (portal)", ...Object.values(body.measurements)];
      conn.prepare(`INSERT INTO measurements (${cols.join(",")}) VALUES (${placeholders})`).run(...values);
    }

    conn.prepare(`
      INSERT INTO appointments (
        type, customer_id, group_order_id, customer_name, customer_phone, customer_email,
        appointment_date, event_date, stage, status,
        garment_description, deposit_cents, total_cents, balance_cents, notes
      ) VALUES (
        'rental', ?, ?, ?, ?, ?,
        ?, ?, 'scheduled', 'open',
        ?, 0, 0, 0, ?
      )
    `).run(
      customerId, group.id, body.name, body.phone || null, body.email || null,
      group.event_date ? `${group.event_date} 17:00` : new Date().toISOString().slice(0, 16),
      group.event_date,
      body.suit_size ? `Self-reported size: ${body.suit_size}` : null,
      body.notes || null,
    );
  });
  tx();

  return NextResponse.json({ ok: true });
}
