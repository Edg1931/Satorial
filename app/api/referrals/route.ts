import { NextRequest, NextResponse } from "next/server";
import { exec, one } from "@/lib/db";
import { generateReferralCode } from "@/lib/loyalty";
import type { Customer } from "@/lib/types";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.referrer_customer_id) return NextResponse.json({ error: "referrer_customer_id required" }, { status: 400 });
  const customer = await one<Customer>("SELECT * FROM customers WHERE id = ?", [body.referrer_customer_id]);
  if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
  let code = generateReferralCode(customer.name);
  for (let i = 0; i < 5; i++) {
    const exists = await one("SELECT id FROM referrals WHERE code = ?", [code]);
    if (!exists) break;
    code = generateReferralCode(customer.name);
  }
  const r = await exec(`INSERT INTO referrals (code, referrer_customer_id, reward_credit_cents) VALUES (?, ?, ?)`, [code, customer.id, body.reward_credit_cents || 5000]);
  return NextResponse.json({ id: r.insertId, code });
}
