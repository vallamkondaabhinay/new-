import { DatabaseSync } from 'node:sqlite';
import path from 'node:path';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { normalizePhoneNumber } from '../utils/salonMath.ts';

const DB_DIR = path.resolve(process.cwd(), 'data');
if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

const DB_FILE = path.join(DB_DIR, 'salon.db');
export const db = new DatabaseSync(DB_FILE);

// Enable WAL mode and foreign keys for durability and performance
db.exec('PRAGMA journal_mode = WAL;');
db.exec('PRAGMA foreign_keys = ON;');

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS owners (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    salt TEXT NOT NULL,
    phone TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS salon_settings (
    id TEXT PRIMARY KEY,
    business_name TEXT NOT NULL,
    business_types_json TEXT NOT NULL,
    tagline TEXT,
    address TEXT,
    phone TEXT,
    email TEXT,
    currency TEXT NOT NULL DEFAULT 'INR',
    tax_rate REAL NOT NULL DEFAULT 18.0,
    invoice_prefix TEXT NOT NULL DEFAULT 'GG-',
    default_duration_mins INTEGER NOT NULL DEFAULT 45,
    opening_time TEXT DEFAULT '09:30',
    closing_time TEXT DEFAULT '20:30',
    weekly_off TEXT DEFAULT 'Tuesday',
    whatsapp_enabled INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS sessions (
    token TEXT PRIMARY KEY,
    owner_id TEXT NOT NULL,
    created_at TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    FOREIGN KEY(owner_id) REFERENCES owners(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS customers (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT NOT NULL,
    normalized_phone TEXT UNIQUE NOT NULL,
    email TEXT,
    birthday TEXT,
    gender TEXT,
    notes TEXT,
    allergies TEXT,
    marketing_consent INTEGER DEFAULT 1,
    whatsapp_consent INTEGER DEFAULT 1,
    loyalty_points REAL DEFAULT 0,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    duration_mins INTEGER NOT NULL DEFAULT 30,
    cost_estimate REAL DEFAULT 0,
    price REAL NOT NULL,
    tax_rate REAL DEFAULT 18.0,
    revisit_interval_days INTEGER DEFAULT 30,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    sku TEXT UNIQUE NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    purchase_cost REAL NOT NULL DEFAULT 0,
    selling_price REAL NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0,
    reorder_threshold INTEGER NOT NULL DEFAULT 5,
    supplier TEXT,
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS stock_movements (
    id TEXT PRIMARY KEY,
    product_id TEXT NOT NULL,
    movement_type TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    previous_stock INTEGER NOT NULL,
    new_stock INTEGER NOT NULL,
    invoice_id TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(product_id) REFERENCES products(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS staff (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    job_title TEXT NOT NULL,
    assigned_categories_json TEXT DEFAULT '[]',
    joining_date TEXT,
    status TEXT DEFAULT 'active',
    working_hours TEXT DEFAULT '09:30 - 20:30',
    commission_percent REAL DEFAULT 5.0,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS staff_attendance (
    id TEXT PRIMARY KEY,
    staff_id TEXT NOT NULL,
    date TEXT NOT NULL,
    check_in_time TEXT,
    check_out_time TEXT,
    status TEXT DEFAULT 'present',
    notes TEXT,
    FOREIGN KEY(staff_id) REFERENCES staff(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS appointments (
    id TEXT PRIMARY KEY,
    appointment_number TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    staff_id TEXT,
    date TEXT NOT NULL,
    start_time TEXT NOT NULL,
    duration_mins INTEGER NOT NULL DEFAULT 45,
    status TEXT NOT NULL DEFAULT 'booked',
    notes TEXT,
    advance_paid REAL DEFAULT 0,
    service_ids_json TEXT NOT NULL DEFAULT '[]',
    total_estimated REAL DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS invoices (
    id TEXT PRIMARY KEY,
    invoice_number TEXT UNIQUE NOT NULL,
    customer_id TEXT NOT NULL,
    appointment_id TEXT,
    subtotal REAL NOT NULL,
    discount_type TEXT DEFAULT 'fixed',
    discount_val REAL DEFAULT 0,
    discount_amount REAL DEFAULT 0,
    tax_rate REAL DEFAULT 18.0,
    tax_amount REAL DEFAULT 0,
    total_amount REAL NOT NULL,
    paid_amount REAL NOT NULL DEFAULT 0,
    balance_due REAL NOT NULL DEFAULT 0,
    payment_method TEXT DEFAULT 'cash',
    status TEXT NOT NULL DEFAULT 'paid',
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS invoice_items (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    item_type TEXT NOT NULL,
    item_id TEXT NOT NULL,
    item_name TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    staff_id TEXT,
    line_total REAL NOT NULL,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS payments (
    id TEXT PRIMARY KEY,
    invoice_id TEXT NOT NULL,
    customer_id TEXT NOT NULL,
    amount REAL NOT NULL,
    method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'received',
    transaction_ref TEXT,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY(invoice_id) REFERENCES invoices(id) ON DELETE CASCADE,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE RESTRICT
  );

  CREATE TABLE IF NOT EXISTS expenses (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    category TEXT NOT NULL,
    amount REAL NOT NULL,
    payment_method TEXT DEFAULT 'cash',
    date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS packages (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    validity_days INTEGER DEFAULT 90,
    included_services_json TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS memberships (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    validity_days INTEGER DEFAULT 365,
    discount_percent REAL DEFAULT 10,
    benefits_json TEXT NOT NULL DEFAULT '[]',
    is_active INTEGER DEFAULT 1,
    created_at TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS loyalty_ledger (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    points_change REAL NOT NULL,
    reason TEXT NOT NULL,
    invoice_id TEXT,
    balance_after REAL NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS reminders (
    id TEXT PRIMARY KEY,
    customer_id TEXT NOT NULL,
    type TEXT NOT NULL,
    target_date TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'simulated',
    channel TEXT NOT NULL DEFAULT 'whatsapp',
    message_body TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(customer_id) REFERENCES customers(id) ON DELETE CASCADE
  );
`);

// Password utilities
export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, 64).toString('hex');
  return { hash, salt };
}

export function verifyPassword(password: string, hash: string, salt: string): boolean {
  const checkHash = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(hash, 'hex'), Buffer.from(checkHash, 'hex'));
}

export function generateToken(): string {
  return crypto.randomBytes(32).toString('hex');
}

export function generateUniqueCode(prefix: string = 'GG'): string {
  const dateStr = new Date().toISOString().slice(2, 10).replace(/-/g, '');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${dateStr}-${rand}`;
}
