import { createClient, type Client, type InValue, type Row } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

let _initPromise: Promise<Client> | null = null;

function resolveDbUrl(): { url: string; authToken?: string } {
  const tursoUrl = process.env.TURSO_DATABASE_URL;
  if (tursoUrl) return { url: tursoUrl, authToken: process.env.TURSO_AUTH_TOKEN };
  let raw = process.env.SATORIAL_DB_PATH;
  if (!raw) {
    if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME || process.env.NETLIFY) {
      raw = "/tmp/satorial.db";
    } else {
      raw = path.join(process.cwd(), "data", "satorial.db");
    }
  }
  if (raw.startsWith("libsql:") || raw.startsWith("http")) return { url: raw };
  // file: URL or bare path — ensure parent directory exists
  const filePath = raw.startsWith("file:") ? raw.slice(5) : raw;
  try { fs.mkdirSync(path.dirname(filePath), { recursive: true }); } catch {}
  return { url: raw.startsWith("file:") ? raw : `file:${raw}` };
}

export async function db(): Promise<Client> {
  if (!_initPromise) {
    _initPromise = (async () => {
      const { url, authToken } = resolveDbUrl();
      const client = createClient({ url, authToken });
      await migrate(client);
      await seedIfEmpty(client);
      return client;
    })().catch((e) => { _initPromise = null; throw e; });
  }
  return _initPromise;
}

export async function one<T = any>(sql: string, args: InValue[] = []): Promise<T | undefined> {
  const c = await db();
  const r = await c.execute({ sql, args });
  return r.rows[0] ? (rowToObject(r.rows[0]) as T) : undefined;
}

export async function many<T = any>(sql: string, args: InValue[] = []): Promise<T[]> {
  const c = await db();
  const r = await c.execute({ sql, args });
  return r.rows.map((row) => rowToObject(row) as T);
}

export async function exec(sql: string, args: InValue[] = []): Promise<{ insertId: number; rowsAffected: number }> {
  const c = await db();
  const r = await c.execute({ sql, args });
  return { insertId: Number(r.lastInsertRowid ?? 0), rowsAffected: Number(r.rowsAffected ?? 0) };
}

function rowToObject(row: Row): any {
  const out: any = {};
  for (const k of Object.keys(row)) {
    if (/^\d+$/.test(k)) continue;
    out[k] = (row as any)[k];
  }
  return out;
}

async function migrate(c: Client) {
  const stmts = SCHEMA_SQL.split(";").map((s) => s.trim()).filter(Boolean);
  for (const s of stmts) await c.execute(s);
  await ensureColumn(c, "appointments", "rental_state", "TEXT NOT NULL DEFAULT 'reserved'");
  await ensureColumn(c, "sales", "staff_id", "INTEGER");
  await ensureColumn(c, "sales", "referral_code", "TEXT");
  await ensureColumn(c, "sales", "credit_applied_cents", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(c, "customers", "referral_code_owned", "TEXT");
  await ensureColumn(c, "customers", "loyalty_credits_cents", "INTEGER NOT NULL DEFAULT 0");
  await ensureColumn(c, "staff", "commission_percent", "REAL NOT NULL DEFAULT 0");
}

async function ensureColumn(c: Client, table: string, column: string, definition: string) {
  const r = await c.execute(`PRAGMA table_info(${table})`);
  const cols = r.rows.map((row) => (row as any).name as string);
  if (!cols.includes(column)) await c.execute(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

const SCHEMA_SQL = `
CREATE TABLE IF NOT EXISTS styles (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  style_code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  description TEXT,
  base_price_cents INTEGER NOT NULL DEFAULT 0,
  base_cost_cents INTEGER NOT NULL DEFAULT 0,
  is_rental INTEGER NOT NULL DEFAULT 0,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  style_id INTEGER REFERENCES styles(id) ON DELETE SET NULL,
  sku TEXT UNIQUE NOT NULL,
  barcode TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  brand TEXT,
  color TEXT,
  size TEXT,
  material TEXT,
  cost_cents INTEGER NOT NULL DEFAULT 0,
  price_cents INTEGER NOT NULL DEFAULT 0,
  quantity INTEGER NOT NULL DEFAULT 0,
  reorder_point INTEGER NOT NULL DEFAULT 0,
  supplier TEXT,
  location TEXT,
  notes TEXT,
  is_rental INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_items_category ON items(category);
CREATE INDEX IF NOT EXISTS idx_items_size ON items(size);
CREATE INDEX IF NOT EXISTS idx_items_style ON items(style_id);
CREATE TABLE IF NOT EXISTS customers (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address TEXT,
  birthday TEXT,
  preferences TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);
CREATE TABLE IF NOT EXISTS measurements (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  taken_at TEXT NOT NULL DEFAULT (datetime('now')),
  taken_by TEXT,
  chest REAL, waist REAL, hips REAL, seat REAL,
  shoulder REAL, sleeve_l REAL, sleeve_r REAL,
  neck REAL, bicep REAL, wrist REAL,
  jacket_length REAL, back_length REAL,
  inseam REAL, outseam REAL, thigh REAL, knee REAL, trouser_rise REAL,
  shoe_size REAL,
  posture TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_meas_customer ON measurements(customer_id);
CREATE TABLE IF NOT EXISTS group_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  event_type TEXT,
  event_date TEXT,
  organizer_name TEXT,
  organizer_phone TEXT,
  organizer_email TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS appointments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT NOT NULL,
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  group_order_id INTEGER REFERENCES group_orders(id) ON DELETE SET NULL,
  customer_name TEXT NOT NULL,
  customer_phone TEXT,
  customer_email TEXT,
  appointment_date TEXT NOT NULL,
  event_date TEXT,
  garment_expected_date TEXT,
  garment_delivered_date TEXT,
  rental_pickup_date TEXT,
  rental_return_date TEXT,
  stage TEXT NOT NULL DEFAULT 'scheduled',
  status TEXT NOT NULL DEFAULT 'open',
  garment_description TEXT,
  fabric TEXT,
  style_notes TEXT,
  deposit_cents INTEGER NOT NULL DEFAULT 0,
  total_cents INTEGER NOT NULL DEFAULT 0,
  balance_cents INTEGER NOT NULL DEFAULT 0,
  assigned_to TEXT,
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments(appointment_date);
CREATE INDEX IF NOT EXISTS idx_appt_event ON appointments(event_date);
CREATE INDEX IF NOT EXISTS idx_appt_stage ON appointments(stage);
CREATE TABLE IF NOT EXISTS sales (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sold_at TEXT NOT NULL DEFAULT (datetime('now')),
  customer_id INTEGER REFERENCES customers(id) ON DELETE SET NULL,
  total_cents INTEGER NOT NULL DEFAULT 0,
  tax_cents INTEGER NOT NULL DEFAULT 0,
  discount_cents INTEGER NOT NULL DEFAULT 0,
  customer_name TEXT,
  payment_method TEXT,
  notes TEXT
);
CREATE INDEX IF NOT EXISTS idx_sales_sold_at ON sales(sold_at);
CREATE TABLE IF NOT EXISTS sale_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  item_id INTEGER NOT NULL REFERENCES items(id),
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_cents INTEGER NOT NULL DEFAULT 0,
  size_at_sale TEXT,
  category_at_sale TEXT,
  name_at_sale TEXT
);
CREATE INDEX IF NOT EXISTS idx_sale_items_item ON sale_items(item_id);
CREATE INDEX IF NOT EXISTS idx_sale_items_size ON sale_items(size_at_sale);
CREATE INDEX IF NOT EXISTS idx_sale_items_cat ON sale_items(category_at_sale);
CREATE TABLE IF NOT EXISTS social_connections (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  platform TEXT UNIQUE NOT NULL,
  account_handle TEXT,
  account_id TEXT,
  access_token TEXT,
  refresh_token TEXT,
  expires_at TEXT,
  status TEXT NOT NULL DEFAULT 'disconnected',
  connected_at TEXT,
  metadata TEXT
);
CREATE TABLE IF NOT EXISTS social_posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  caption TEXT NOT NULL,
  hashtags TEXT,
  media_urls TEXT,
  platforms TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_for TEXT,
  posted_at TEXT,
  results TEXT,
  campaign TEXT,
  created_by TEXT DEFAULT 'user',
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_social_posts_status ON social_posts(status);
CREATE INDEX IF NOT EXISTS idx_social_posts_scheduled ON social_posts(scheduled_for);
CREATE TABLE IF NOT EXISTS ai_messages (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  conversation_id TEXT NOT NULL,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON ai_messages(conversation_id);
CREATE TABLE IF NOT EXISTS staff (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  phone TEXT,
  role TEXT NOT NULL DEFAULT 'sales',
  pin TEXT,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS purchase_orders (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  supplier TEXT NOT NULL,
  ordered_at TEXT NOT NULL DEFAULT (datetime('now')),
  expected_at TEXT,
  received_at TEXT,
  status TEXT NOT NULL DEFAULT 'open',
  total_cents INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS purchase_order_items (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  po_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id),
  sku TEXT,
  name TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_cost_cents INTEGER NOT NULL DEFAULT 0
);
CREATE TABLE IF NOT EXISTS expenses (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  occurred_at TEXT NOT NULL DEFAULT (datetime('now')),
  category TEXT NOT NULL,
  amount_cents INTEGER NOT NULL,
  vendor TEXT,
  notes TEXT
);
CREATE TABLE IF NOT EXISTS campaigns (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  channel TEXT NOT NULL,
  audience TEXT NOT NULL,
  audience_filter TEXT,
  subject TEXT,
  body TEXT NOT NULL,
  trigger_type TEXT NOT NULL DEFAULT 'manual',
  trigger_config TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  scheduled_for TEXT,
  sent_at TEXT,
  stats TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS campaign_sends (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id),
  channel TEXT NOT NULL,
  address TEXT NOT NULL,
  status TEXT NOT NULL,
  provider_id TEXT,
  error TEXT,
  sent_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS integrations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  provider TEXT UNIQUE NOT NULL,
  status TEXT NOT NULL DEFAULT 'disconnected',
  config TEXT,
  last_sync_at TEXT,
  last_sync_summary TEXT
);
CREATE TABLE IF NOT EXISTS ai_actions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  tool TEXT NOT NULL,
  params TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  result TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS wedding_portals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  group_order_id INTEGER NOT NULL REFERENCES group_orders(id) ON DELETE CASCADE,
  token TEXT UNIQUE NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS wishlist (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  item_id INTEGER REFERENCES items(id) ON DELETE SET NULL,
  style_id INTEGER REFERENCES styles(id) ON DELETE SET NULL,
  label TEXT,
  notify_email INTEGER NOT NULL DEFAULT 1,
  notify_sms INTEGER NOT NULL DEFAULT 0,
  notified_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_wishlist_customer ON wishlist(customer_id);
CREATE INDEX IF NOT EXISTS idx_wishlist_item ON wishlist(item_id);
CREATE TABLE IF NOT EXISTS referrals (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  code TEXT UNIQUE NOT NULL,
  referrer_customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  referee_customer_id INTEGER REFERENCES customers(id),
  referee_sale_id INTEGER REFERENCES sales(id),
  reward_credit_cents INTEGER NOT NULL DEFAULT 5000,
  status TEXT NOT NULL DEFAULT 'pending',
  redeemed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_referrals_code ON referrals(code);
CREATE TABLE IF NOT EXISTS commissions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  staff_id INTEGER NOT NULL REFERENCES staff(id),
  percent REAL NOT NULL,
  amount_cents INTEGER NOT NULL,
  paid_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_commissions_staff ON commissions(staff_id);
CREATE TABLE IF NOT EXISTS corporate_accounts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  contact_name TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  billing_email TEXT,
  stipend_cents INTEGER NOT NULL DEFAULT 0,
  stipend_period TEXT NOT NULL DEFAULT 'annual',
  notes TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS corporate_employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  account_id INTEGER NOT NULL REFERENCES corporate_accounts(id) ON DELETE CASCADE,
  customer_id INTEGER REFERENCES customers(id),
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  role TEXT,
  stipend_balance_cents INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_corp_emp_account ON corporate_employees(account_id);
CREATE TABLE IF NOT EXISTS drip_flows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  trigger TEXT NOT NULL,
  active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS drip_flow_steps (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flow_id INTEGER NOT NULL REFERENCES drip_flows(id) ON DELETE CASCADE,
  sequence INTEGER NOT NULL,
  delay_days INTEGER NOT NULL DEFAULT 0,
  channel TEXT NOT NULL,
  subject TEXT,
  body TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS drip_enrollments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  flow_id INTEGER NOT NULL REFERENCES drip_flows(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  enrolled_at TEXT NOT NULL DEFAULT (datetime('now')),
  next_step INTEGER NOT NULL DEFAULT 1,
  next_run_at TEXT,
  status TEXT NOT NULL DEFAULT 'active'
);
CREATE INDEX IF NOT EXISTS idx_drip_next ON drip_enrollments(next_run_at, status);
CREATE TABLE IF NOT EXISTS lookbook (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  item_id INTEGER REFERENCES items(id),
  style_id INTEGER REFERENCES styles(id),
  title TEXT NOT NULL,
  caption TEXT NOT NULL,
  hashtags TEXT,
  image_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)
`;

async function seedIfEmpty(c: Client) {
  const get = async (sql: string) => Number((await c.execute(sql)).rows[0]?.c ?? 0);
  if (await get("SELECT COUNT(*) as c FROM items") === 0) await seedInventory(c);
  if (await get("SELECT COUNT(*) as c FROM customers") === 0) await seedCustomers(c);
  if (await get("SELECT COUNT(*) as c FROM appointments") === 0) await seedAppointments(c);
  if (await get("SELECT COUNT(*) as c FROM sales") === 0) await seedSales(c);
  if (await get("SELECT COUNT(*) as c FROM social_connections") === 0) await seedSocial(c);
  if (await get("SELECT COUNT(*) as c FROM staff") === 0) {
    await c.execute({ sql: "INSERT INTO staff (name, email, role, pin) VALUES (?, ?, 'owner', ?)", args: ["Owner", "owner@satorial.local", "0000"] });
  }
  if (await get("SELECT COUNT(*) as c FROM integrations") === 0) {
    for (const p of ["clover", "twilio", "resend"]) {
      await c.execute({ sql: "INSERT INTO integrations (provider, status) VALUES (?, 'disconnected')", args: [p] });
    }
  }
  if (await get("SELECT COUNT(*) as c FROM drip_flows") === 0) await seedDripFlows(c);
}

async function seedInventory(c: Client) {
  const styles = [
    { style_code: "ST-WOOL-2P", name: "Two-Piece Wool Suit", category: "Suits", brand: "Satorial", description: "Half-canvas, Super 120s wool, two-button notch lapel.", base_price_cents: 79900, base_cost_cents: 28000, is_rental: 0 },
    { style_code: "TX-PEAK", name: "Peak Lapel Tuxedo", category: "Tuxedos", brand: "Satorial", description: "Wool with satin peak lapel and trouser stripe.", base_price_cents: 119900, base_cost_cents: 38000, is_rental: 1 },
    { style_code: "SH-SPRD", name: "Spread Collar Dress Shirt", category: "Shirts", brand: "Satorial", description: "Two-ply cotton, spread collar, mother-of-pearl buttons.", base_price_cents: 11900, base_cost_cents: 3500, is_rental: 0 },
    { style_code: "TI-SILK", name: "Silk Tie", category: "Accessories", brand: "Satorial", description: "100% Italian silk, 3.25\" blade.", base_price_cents: 5900, base_cost_cents: 1800, is_rental: 0 },
    { style_code: "SHO-OXF", name: "Cap-Toe Oxford", category: "Shoes", brand: "Satorial", description: "Goodyear-welted calfskin, leather sole.", base_price_cents: 24900, base_cost_cents: 9000, is_rental: 0 },
    { style_code: "BLT-DRS", name: "Leather Dress Belt", category: "Accessories", brand: "Satorial", description: "Calfskin with brushed nickel buckle.", base_price_cents: 6900, base_cost_cents: 1500, is_rental: 0 },
  ];
  const variants: Record<string, Array<{ color: string; size: string; quantity: number; reorder_point: number; supplier: string; location: string; material: string }>> = {
    "ST-WOOL-2P": [
      { color: "Navy", size: "38R", quantity: 3, reorder_point: 2, supplier: "Milano Mills", location: "Floor A1", material: "Super 120s Wool" },
      { color: "Navy", size: "40R", quantity: 6, reorder_point: 2, supplier: "Milano Mills", location: "Floor A1", material: "Super 120s Wool" },
      { color: "Navy", size: "42R", quantity: 5, reorder_point: 2, supplier: "Milano Mills", location: "Floor A1", material: "Super 120s Wool" },
      { color: "Navy", size: "44R", quantity: 2, reorder_point: 2, supplier: "Milano Mills", location: "Floor A1", material: "Super 120s Wool" },
      { color: "Charcoal", size: "40R", quantity: 4, reorder_point: 2, supplier: "Milano Mills", location: "Floor A1", material: "Super 120s Wool" },
      { color: "Charcoal", size: "42R", quantity: 4, reorder_point: 2, supplier: "Milano Mills", location: "Floor A1", material: "Super 120s Wool" },
      { color: "Charcoal", size: "44L", quantity: 1, reorder_point: 1, supplier: "Milano Mills", location: "Floor A1", material: "Super 120s Wool" },
    ],
    "TX-PEAK": [
      { color: "Black", size: "40R", quantity: 4, reorder_point: 1, supplier: "Milano Mills", location: "Floor A2", material: "Wool/Satin" },
      { color: "Black", size: "42R", quantity: 5, reorder_point: 2, supplier: "Milano Mills", location: "Floor A2", material: "Wool/Satin" },
      { color: "Black", size: "44L", quantity: 3, reorder_point: 1, supplier: "Milano Mills", location: "Floor A2", material: "Wool/Satin" },
      { color: "Midnight Blue", size: "42R", quantity: 2, reorder_point: 1, supplier: "Milano Mills", location: "Floor A2", material: "Wool/Satin" },
    ],
    "SH-SPRD": [
      { color: "White", size: "15/33", quantity: 14, reorder_point: 6, supplier: "Atelier Linen", location: "Wall S3", material: "2-Ply Cotton" },
      { color: "White", size: "16/34", quantity: 18, reorder_point: 6, supplier: "Atelier Linen", location: "Wall S3", material: "2-Ply Cotton" },
      { color: "White", size: "17/35", quantity: 9, reorder_point: 6, supplier: "Atelier Linen", location: "Wall S3", material: "2-Ply Cotton" },
      { color: "Light Blue", size: "15/33", quantity: 12, reorder_point: 6, supplier: "Atelier Linen", location: "Wall S3", material: "2-Ply Cotton" },
      { color: "Light Blue", size: "16/34", quantity: 11, reorder_point: 6, supplier: "Atelier Linen", location: "Wall S3", material: "2-Ply Cotton" },
    ],
    "TI-SILK": [
      { color: "Burgundy", size: "OS", quantity: 22, reorder_point: 8, supplier: "Como Silks", location: "Counter B", material: "100% Silk" },
      { color: "Navy", size: "OS", quantity: 18, reorder_point: 8, supplier: "Como Silks", location: "Counter B", material: "100% Silk" },
      { color: "Forest", size: "OS", quantity: 9, reorder_point: 6, supplier: "Como Silks", location: "Counter B", material: "100% Silk" },
    ],
    "SHO-OXF": [
      { color: "Black", size: "9", quantity: 3, reorder_point: 2, supplier: "Northampton Co.", location: "Floor B2", material: "Calfskin" },
      { color: "Black", size: "10", quantity: 5, reorder_point: 2, supplier: "Northampton Co.", location: "Floor B2", material: "Calfskin" },
      { color: "Black", size: "11", quantity: 4, reorder_point: 2, supplier: "Northampton Co.", location: "Floor B2", material: "Calfskin" },
      { color: "Brown", size: "10", quantity: 3, reorder_point: 2, supplier: "Northampton Co.", location: "Floor B2", material: "Calfskin" },
    ],
    "BLT-DRS": [
      { color: "Black", size: "32", quantity: 6, reorder_point: 3, supplier: "Northampton Co.", location: "Counter B", material: "Calfskin" },
      { color: "Black", size: "34", quantity: 14, reorder_point: 5, supplier: "Northampton Co.", location: "Counter B", material: "Calfskin" },
      { color: "Black", size: "36", quantity: 9, reorder_point: 4, supplier: "Northampton Co.", location: "Counter B", material: "Calfskin" },
      { color: "Brown", size: "34", quantity: 7, reorder_point: 3, supplier: "Northampton Co.", location: "Counter B", material: "Calfskin" },
    ],
  };
  for (const s of styles) {
    const r = await c.execute({
      sql: `INSERT INTO styles (style_code, name, category, brand, description, base_price_cents, base_cost_cents, is_rental) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      args: [s.style_code, s.name, s.category, s.brand, s.description, s.base_price_cents, s.base_cost_cents, s.is_rental],
    });
    const styleId = Number(r.lastInsertRowid);
    const vs = variants[s.style_code] || [];
    for (const v of vs) {
      const sku = `${s.style_code}-${v.color.replace(/\s+/g, "").slice(0, 3).toUpperCase()}-${v.size.replace(/\W+/g, "")}`;
      const barcode = generateBarcode(sku);
      await c.execute({
        sql: `INSERT INTO items (style_id, sku, barcode, name, category, brand, color, size, material, cost_cents, price_cents, quantity, reorder_point, supplier, location, is_rental) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        args: [styleId, sku, barcode, s.name, s.category, s.brand, v.color, v.size, v.material, s.base_cost_cents, s.base_price_cents, v.quantity, v.reorder_point, v.supplier, v.location, s.is_rental],
      });
    }
  }
}

async function seedCustomers(c: Client) {
  const a = await c.execute({ sql: "INSERT INTO customers (name, email, phone, preferences, notes) VALUES (?, ?, ?, ?, ?)", args: ["Marcus Whitfield", "marcus@example.com", "555-0101", "Slim cut, peak lapel", "Wedding July 2026"] });
  await c.execute({ sql: "INSERT INTO measurements (customer_id, taken_by, chest, waist, shoulder, sleeve_l, sleeve_r, neck, jacket_length, inseam, trouser_rise, shoe_size, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [Number(a.lastInsertRowid), "Owner", 41, 34, 18.5, 25.5, 25.5, 16, 30, 32, 11, 10.5, "Slight forward shoulder"] });
  const b = await c.execute({ sql: "INSERT INTO customers (name, email, phone, preferences, notes) VALUES (?, ?, ?, ?, ?)", args: ["Daniel Hayes", "daniel@example.com", "555-0102", "Classic charcoal, full canvas", "Anniversary client"] });
  await c.execute({ sql: "INSERT INTO measurements (customer_id, taken_by, chest, waist, shoulder, sleeve_l, sleeve_r, neck, jacket_length, inseam, trouser_rise, shoe_size, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)", args: [Number(b.lastInsertRowid), "Owner", 43, 36, 19, 26, 26, 16.5, 30.5, 33, 11.5, 11, ""] });
  await c.execute({ sql: "INSERT INTO customers (name, email, phone, preferences, notes) VALUES (?, ?, ?, ?, ?)", args: ["Anthony Reyes", "anthony@example.com", "555-0103", "Tuxedo rentals for events", ""] });
}

async function seedAppointments(c: Client) {
  const today = new Date();
  const days = (n: number) => { const d = new Date(today); d.setDate(d.getDate() + n); return d.toISOString().slice(0, 10); };
  await c.execute({
    sql: `INSERT INTO appointments (type, customer_id, customer_name, customer_phone, customer_email, appointment_date, event_date, garment_expected_date, stage, status, garment_description, fabric, deposit_cents, total_cents, balance_cents, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["custom_suit", 1, "Marcus Whitfield", "555-0101", "marcus@example.com", days(2) + " 14:00", days(60), days(45), "measured", "open", "Two-piece navy suit, peak lapel, working buttonholes", "Loro Piana Super 130s — Navy Sharkskin", 50000, 175000, 125000, "Wedding — groom"],
  });
  await c.execute({
    sql: `INSERT INTO appointments (type, customer_id, customer_name, customer_phone, customer_email, appointment_date, event_date, rental_pickup_date, rental_return_date, stage, status, garment_description, deposit_cents, total_cents, balance_cents, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    args: ["rental", 3, "Anthony Reyes", "555-0103", "anthony@example.com", days(1) + " 11:00", days(10), days(8), days(12), "scheduled", "open", "Black peak lapel tuxedo 42R + white tux shirt 16/34 + black bowtie", 10000, 22500, 12500, "Charity gala"],
  });
  const g = await c.execute({ sql: "INSERT INTO group_orders (name, event_type, event_date, organizer_name, organizer_email, notes) VALUES (?, ?, ?, ?, ?, ?)", args: ["Whitfield Wedding Party", "wedding", days(60), "Marcus Whitfield", "marcus@example.com", "5 groomsmen + groom"] });
  const groupId = Number(g.lastInsertRowid);
  for (const name of ["Eli Pierce", "Jamal Cole", "Trevor Lin", "Owen Park", "Devon Brooks"]) {
    await c.execute({
      sql: `INSERT INTO appointments (type, group_order_id, customer_name, appointment_date, event_date, rental_pickup_date, rental_return_date, stage, status, garment_description, deposit_cents, total_cents, balance_cents) VALUES ('rental', ?, ?, ?, ?, ?, ?, 'scheduled', 'open', 'Charcoal suit + matching tie', 5000, 19900, 14900)`,
      args: [groupId, name, days(40) + " 17:00", days(60), days(58), days(62)],
    });
  }
}

async function seedSales(c: Client) {
  const items = (await c.execute("SELECT id, price_cents, size, category, name FROM items")).rows.map((r) => rowToObject(r)) as Array<{ id: number; price_cents: number; size: string; category: string; name: string }>;
  if (items.length === 0) return;
  const now = Date.now();
  for (let i = 0; i < 28; i++) {
    const dayOffset = Math.floor(Math.random() * 60);
    const d = new Date(now - dayOffset * 86400000).toISOString().replace("T", " ").slice(0, 19);
    const lineCount = 1 + Math.floor(Math.random() * 3);
    const lines: { item: typeof items[number]; qty: number }[] = [];
    let total = 0;
    for (let j = 0; j < lineCount; j++) {
      const it = items[Math.floor(Math.random() * items.length)];
      lines.push({ item: it, qty: 1 });
      total += it.price_cents;
    }
    const r = await c.execute({ sql: "INSERT INTO sales (sold_at, customer_name, total_cents, payment_method) VALUES (?, ?, ?, ?)", args: [d, ["Walk-in", "Marcus W.", "Daniel H.", "Anthony R.", "—"][Math.floor(Math.random() * 5)], total, ["Card", "Cash", "Card", "Card"][Math.floor(Math.random() * 4)]] });
    const saleId = Number(r.lastInsertRowid);
    for (const l of lines) {
      await c.execute({ sql: "INSERT INTO sale_items (sale_id, item_id, quantity, unit_price_cents, size_at_sale, category_at_sale, name_at_sale) VALUES (?, ?, ?, ?, ?, ?, ?)", args: [saleId, l.item.id, l.qty, l.item.price_cents, l.item.size, l.item.category, l.item.name] });
    }
  }
}

async function seedSocial(c: Client) {
  for (const [platform, handle] of [["instagram", "@satorial"], ["facebook", "Satorial"], ["x", "@satorial"], ["tiktok", "@satorial"], ["linkedin", "Satorial"]] as Array<[string, string]>) {
    await c.execute({ sql: "INSERT INTO social_connections (platform, account_handle, status) VALUES (?, ?, 'disconnected')", args: [platform, handle] });
  }
}

async function seedDripFlows(c: Client) {
  const flows = [
    { name: "Welcome series", description: "Three touches over 14 days for every new customer.", trigger: "new_customer",
      steps: [
        { delay_days: 0, channel: "email", subject: "Welcome to Satorial, {{first_name}}", body: "Hi {{first_name}},\n\nThanks for stopping in. A few things you should know about us — and a small token for joining the book.\n\n— The Satorial team" },
        { delay_days: 7, channel: "email", subject: "What we wish every man knew about fit", body: "Hi {{first_name}},\n\nA quick read on shoulder, jacket length, and trouser break — the three things that separate a good suit from a great one.\n\n— Satorial" },
        { delay_days: 14, channel: "email", subject: "Have a moment for a fitting?", body: "Hi {{first_name}},\n\nWhenever you're ready for a measure-up, our calendar is open. Reply with two times that work.\n\n— Satorial" },
      ] },
    { name: "Post-purchase fit follow-up", description: "Day 7 check-in after a sale.", trigger: "post_purchase",
      steps: [{ delay_days: 7, channel: "email", subject: "How's it wearing, {{first_name}}?", body: "Hi {{first_name}},\n\nHope you've had a chance to wear what you picked up. If anything needs adjusting, drop in this week — first round is on us.\n\n— Satorial" }] },
    { name: "Care guide", description: "Day 30 garment-care primer.", trigger: "post_purchase",
      steps: [{ delay_days: 30, channel: "email", subject: "Make it last: a 90-second guide", body: "Hi {{first_name}},\n\nSteam not iron. Cedar hangers. 24 hours rest between wears. The little habits that double a wardrobe's life.\n\n— Satorial" }] },
    { name: "Win-back", description: "Re-engage customers after 180 days of silence.", trigger: "lapsed_180",
      steps: [{ delay_days: 0, channel: "email", subject: "It's been a minute, {{first_name}}", body: "Hi {{first_name}},\n\nWe've added some fabrics worth seeing. If you'd like, we'll set aside time and a glass of something — your call.\n\n— Satorial" }] },
    { name: "Review request", description: "Day 14 ask for a Google review after purchase.", trigger: "post_purchase",
      steps: [{ delay_days: 14, channel: "email", subject: "A quick favor", body: "Hi {{first_name}},\n\nIf the experience was a good one, a short Google review would mean a great deal to a small shop. Link below — three sentences is plenty.\n\n— Satorial" }] },
  ];
  for (const f of flows) {
    const r = await c.execute({ sql: "INSERT INTO drip_flows (name, description, trigger) VALUES (?, ?, ?)", args: [f.name, f.description, f.trigger] });
    const id = Number(r.lastInsertRowid);
    for (let i = 0; i < f.steps.length; i++) {
      const s = f.steps[i];
      await c.execute({ sql: "INSERT INTO drip_flow_steps (flow_id, sequence, delay_days, channel, subject, body) VALUES (?, ?, ?, ?, ?, ?)", args: [id, i + 1, s.delay_days, s.channel, s.subject, s.body] });
    }
  }
}

export function generateBarcode(sku: string): string {
  let h = 0;
  for (let i = 0; i < sku.length; i++) h = (h * 31 + sku.charCodeAt(i)) >>> 0;
  const base = String(h).padStart(11, "0").slice(0, 11);
  const digits = base.split("").map(Number);
  const sum = digits.reduce((acc, d, i) => acc + d * (i % 2 === 0 ? 1 : 3), 0);
  const check = (10 - (sum % 10)) % 10;
  return base + String(check);
}
