import { NextRequest, NextResponse } from "next/server";
import { exec } from "@/lib/db";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const r = await exec(`
    INSERT INTO appointments (
      type, customer_id, group_order_id, customer_name, customer_phone, customer_email,
      appointment_date, event_date, garment_expected_date, rental_pickup_date, rental_return_date,
      stage, status, garment_description, fabric, style_notes,
      deposit_cents, total_cents, balance_cents, notes
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    body.type || "consultation",
    body.customer_id || null,
    body.group_order_id || null,
    body.customer_name,
    body.customer_phone || null,
    body.customer_email || null,
    body.appointment_date,
    body.event_date || null,
    body.garment_expected_date || null,
    body.rental_pickup_date || null,
    body.rental_return_date || null,
    body.stage || "scheduled",
    body.status || "open",
    body.garment_description || null,
    body.fabric || null,
    body.style_notes || null,
    body.deposit_cents || 0,
    body.total_cents || 0,
    body.balance_cents || 0,
    body.notes || null,
  ]);
  return NextResponse.json({ id: r.insertId });
}
