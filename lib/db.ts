import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

let _db: Database.Database | null = null;

export function db(): Database.Database {
  if (_db) return _db;
  const dbPath = process.env.SATORIAL_DB_PATH || path.join(process.cwd(), "data", "satorial.db");
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  const conn = new Database(dbPath);
  conn.pragma("journal_mode = WAL");
  conn.pragma("foreign_keys = ON");
  migrate(conn);
  seedIfEmpty(conn);
  _db = conn;
  return conn;
}

function migrate(conn: Database.Database) {
  conn.exec(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
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

    CREATE TABLE IF NOT EXISTS sales (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sold_at TEXT NOT NULL DEFAULT (datetime('now')),
      total_cents INTEGER NOT NULL DEFAULT 0,
      customer_name TEXT,
      payment_method TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS sale_items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
      item_id INTEGER NOT NULL REFERENCES items(id),
      quantity INTEGER NOT NULL DEFAULT 1,
      unit_price_cents INTEGER NOT NULL DEFAULT 0,
      size_at_sale TEXT,
      category_at_sale TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_sale_items_item ON sale_items(item_id);
    CREATE INDEX IF NOT EXISTS idx_sale_items_size ON sale_items(size_at_sale);

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      type TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT,
      customer_email TEXT,
      appointment_date TEXT NOT NULL,
      event_date TEXT,
      garment_expected_date TEXT,
      garment_delivered_date TEXT,
      rental_return_date TEXT,
      status TEXT NOT NULL DEFAULT 'scheduled',
      garment_description TEXT,
      measurements TEXT,
      deposit_cents INTEGER NOT NULL DEFAULT 0,
      total_cents INTEGER NOT NULL DEFAULT 0,
      notes TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_appt_date ON appointments(appointment_date);
    CREATE INDEX IF NOT EXISTS idx_appt_event ON appointments(event_date);

    CREATE TABLE IF NOT EXISTS ai_messages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      conversation_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_ai_msg_conv ON ai_messages(conversation_id);
  `);
}

function seedIfEmpty(conn: Database.Database) {
  const row = conn.prepare("SELECT COUNT(*) as c FROM items").get() as { c: number };
  if (row.c > 0) return;

  const insertItem = conn.prepare(`
    INSERT INTO items (sku, barcode, name, category, brand, color, size, material, cost_cents, price_cents, quantity, reorder_point, supplier, location, is_rental)
    VALUES (@sku, @barcode, @name, @category, @brand, @color, @size, @material, @cost_cents, @price_cents, @quantity, @reorder_point, @supplier, @location, @is_rental)
  `);

  const samples = [
    { sku: "ST-NVY-40R", name: "Two-Piece Wool Suit", category: "Suits", brand: "Satorial", color: "Navy", size: "40R", material: "Super 120s Wool", cost_cents: 28000, price_cents: 79900, quantity: 6, reorder_point: 2, supplier: "Milano Mills", location: "Floor A1", is_rental: 0 },
    { sku: "ST-CHR-42R", name: "Two-Piece Wool Suit", category: "Suits", brand: "Satorial", color: "Charcoal", size: "42R", material: "Super 120s Wool", cost_cents: 28000, price_cents: 79900, quantity: 4, reorder_point: 2, supplier: "Milano Mills", location: "Floor A1", is_rental: 0 },
    { sku: "TX-BLK-44L", name: "Peak Lapel Tuxedo", category: "Tuxedos", brand: "Satorial", color: "Black", size: "44L", material: "Wool with Satin", cost_cents: 38000, price_cents: 119900, quantity: 3, reorder_point: 1, supplier: "Milano Mills", location: "Floor A2", is_rental: 1 },
    { sku: "SH-WHT-16-34", name: "Spread Collar Dress Shirt", category: "Shirts", brand: "Satorial", color: "White", size: "16/34", material: "2-Ply Cotton", cost_cents: 3500, price_cents: 11900, quantity: 18, reorder_point: 6, supplier: "Atelier Linen", location: "Wall S3", is_rental: 0 },
    { sku: "SH-LBL-15-33", name: "Spread Collar Dress Shirt", category: "Shirts", brand: "Satorial", color: "Light Blue", size: "15/33", material: "2-Ply Cotton", cost_cents: 3500, price_cents: 11900, quantity: 12, reorder_point: 6, supplier: "Atelier Linen", location: "Wall S3", is_rental: 0 },
    { sku: "TI-BRG-OS", name: "Silk Tie", category: "Accessories", brand: "Satorial", color: "Burgundy", size: "OS", material: "100% Silk", cost_cents: 1800, price_cents: 5900, quantity: 22, reorder_point: 8, supplier: "Como Silks", location: "Counter B", is_rental: 0 },
    { sku: "SHO-BLK-10", name: "Cap-Toe Oxford", category: "Shoes", brand: "Satorial", color: "Black", size: "10", material: "Calfskin", cost_cents: 9000, price_cents: 24900, quantity: 5, reorder_point: 2, supplier: "Northampton Co.", location: "Floor B2", is_rental: 0 },
    { sku: "BLT-BLK-34", name: "Leather Dress Belt", category: "Accessories", brand: "Satorial", color: "Black", size: "34", material: "Calfskin", cost_cents: 1500, price_cents: 6900, quantity: 14, reorder_point: 5, supplier: "Northampton Co.", location: "Counter B", is_rental: 0 },
  ];

  const insertMany = conn.transaction((rows: typeof samples) => {
    for (const r of rows) {
      const barcode = generateBarcode(r.sku);
      insertItem.run({ ...r, barcode });
    }
  });
  insertMany(samples);
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
