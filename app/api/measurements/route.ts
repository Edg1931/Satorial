import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export const runtime = "nodejs";

const FIELDS = ["chest", "waist", "hips", "seat", "shoulder", "sleeve_l", "sleeve_r", "neck", "bicep", "wrist", "jacket_length", "back_length", "inseam", "outseam", "thigh", "knee", "trouser_rise", "shoe_size"];

export async function POST(req: NextRequest) {
  const body = await req.json();
  if (!body.customer_id) return NextResponse.json({ error: "customer_id required" }, { status: 400 });
  const cols = ["customer_id", "taken_by", "notes", ...FIELDS];
  const placeholders = cols.map(() => "?").join(",");
  const values = cols.map((c) => body[c] ?? null);
  const r = db().prepare(`INSERT INTO measurements (${cols.join(",")}) VALUES (${placeholders})`).run(...values);
  return NextResponse.json({ id: Number(r.lastInsertRowid) });
}
