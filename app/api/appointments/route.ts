import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const r = db().prepare(`
    INSERT INTO appointments (
      type, customer_id, group_order_id, customer_name, customer_phone, customer_email,
      appointment_date, event_date, garment_expected_date, rental_pickup_date, rental_return_date,
      stage, status, garment_description, fabric, style_notes,
      deposit_cents, total_cents, balance_cents, notes
    ) VALUES (
      @type, @customer_id, @group_order_id, @customer_name, @customer_phone, @customer_email,
      @appointment_date, @event_date, @garment_expected_date, @rental_pickup_date, @rental_return_date,
      @stage, @status, @garment_description, @fabric, @style_notes,
      @deposit_cents, @total_cents, @balance_cents, @notes
    )
  `).run({
    type: body.type || "consultation",
    customer_id: body.customer_id || null,
    group_order_id: body.group_order_id || null,
    customer_name: body.customer_name,
    customer_phone: body.customer_phone || null,
    customer_email: body.customer_email || null,
    appointment_date: body.appointment_date,
    event_date: body.event_date || null,
    garment_expected_date: body.garment_expected_date || null,
    rental_pickup_date: body.rental_pickup_date || null,
    rental_return_date: body.rental_return_date || null,
    stage: body.stage || "scheduled",
    status: body.status || "open",
    garment_description: body.garment_description || null,
    fabric: body.fabric || null,
    style_notes: body.style_notes || null,
    deposit_cents: body.deposit_cents || 0,
    total_cents: body.total_cents || 0,
    balance_cents: body.balance_cents || 0,
    notes: body.notes || null,
  });
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
