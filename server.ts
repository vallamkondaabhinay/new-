import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'node:path';
import fs from 'node:fs';
import {
  db,
  hashPassword,
  verifyPassword,
  generateToken,
  generateUniqueCode,
} from './src/server/db.ts';
import {
  normalizePhoneNumber,
  calculateInvoiceTotals,
  calculateNextRevisitDate,
  validateStockAvailability,
} from './src/utils/salonMath.ts';

const app = express();
const PORT = 3000;

app.use(express.json());

// Auth helper middleware
function getSessionOwner(req: Request): any | null {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  const token = authHeader.substring(7).trim();
  const sessionRow = db
    .prepare('SELECT owner_id, expires_at FROM sessions WHERE token = ?')
    .get(token) as { owner_id: string; expires_at: string } | undefined;

  if (!sessionRow) return null;
  if (new Date(sessionRow.expires_at).getTime() < Date.now()) {
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
    return null;
  }

  const owner = db
    .prepare('SELECT id, name, email, phone, created_at FROM owners WHERE id = ?')
    .get(sessionRow.owner_id) as any;

  return owner || null;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const owner = getSessionOwner(req);
  if (!owner) {
    return res.status(401).json({ error: 'Unauthorized. Please log in.' });
  }
  (req as any).owner = owner;
  next();
}

// ---------------------------------------------------------------------------
// 1. AUTH & SETUP ENDPOINTS
// ---------------------------------------------------------------------------

app.get('/api/auth/status', (req: Request, res: Response) => {
  const ownerCountRow = db.prepare('SELECT COUNT(*) as count FROM owners').get() as { count: number };
  const isInitialized = ownerCountRow.count > 0;

  if (!isInitialized) {
    return res.json({ initialized: false, authenticated: false });
  }

  const owner = getSessionOwner(req);
  const salon = db.prepare('SELECT * FROM salon_settings LIMIT 1').get() as any;

  if (salon && salon.business_types_json) {
    try {
      salon.business_types = JSON.parse(salon.business_types_json);
    } catch {
      salon.business_types = [];
    }
  }

  return res.json({
    initialized: true,
    authenticated: !!owner,
    owner: owner || null,
    salon: salon || null,
  });
});

app.post('/api/auth/setup', (req: Request, res: Response) => {
  const ownerCountRow = db.prepare('SELECT COUNT(*) as count FROM owners').get() as { count: number };
  if (ownerCountRow.count > 0) {
    return res.status(400).json({ error: 'Salon is already initialized. Please log in.' });
  }

  const {
    ownerName,
    email,
    password,
    phone,
    businessName,
    businessTypes,
    tagline,
    address,
    currency = 'INR',
    taxRate = 18.0,
    invoicePrefix = 'GG-',
    defaultDurationMins = 45,
    openingTime = '09:30',
    closingTime = '20:30',
    weeklyOff = 'Tuesday',
    prePopulateServices = true,
  } = req.body;

  if (!ownerName || !email || !password || !businessName) {
    return res.status(400).json({ error: 'Owner name, email, password, and salon name are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const ownerId = 'own_' + Date.now();
  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  // Insert owner
  db.prepare(`
    INSERT INTO owners (id, name, email, password_hash, salt, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(ownerId, ownerName.trim(), email.trim().toLowerCase(), hash, salt, phone || '', now);

  // Insert salon settings
  const salonId = 'salon_' + Date.now();
  const typesJson = JSON.stringify(Array.isArray(businessTypes) ? businessTypes : ['Unisex Salon']);
  db.prepare(`
    INSERT INTO salon_settings (
      id, business_name, business_types_json, tagline, address, phone, email,
      currency, tax_rate, invoice_prefix, default_duration_mins, opening_time,
      closing_time, weekly_off, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    salonId,
    businessName.trim(),
    typesJson,
    tagline || 'Elegance & Care in Every Touch',
    address || '',
    phone || '',
    email.trim().toLowerCase(),
    currency,
    Number(taxRate) || 18.0,
    invoicePrefix.trim() || 'GG-',
    Number(defaultDurationMins) || 45,
    openingTime || '09:30',
    closingTime || '20:30',
    weeklyOff || 'Tuesday',
    now,
    now
  );

  // Optionally pre-populate tailored starter services
  if (prePopulateServices) {
    const starterServices = [
      { name: 'Signature Haircut & Style', category: 'Hair Services', duration: 45, price: 650, interval: 30, code: 'HAIR-01' },
      { name: 'Hair Spa Deep Conditioning', category: 'Hair Services', duration: 60, price: 1500, interval: 30, code: 'HAIR-02' },
      { name: 'Hydra Glow Clarifying Facial', category: 'Beauty & Skincare', duration: 60, price: 2200, interval: 28, code: 'SKIN-01' },
      { name: 'Herbal De-Tan & Cleanup', category: 'Beauty & Skincare', duration: 40, price: 950, interval: 21, code: 'SKIN-02' },
      { name: 'Precision Eyebrow Shaping', category: 'Beauty & Skincare', duration: 15, price: 120, interval: 15, code: 'SKIN-03' },
      { name: 'Luxury Spa Pedicure', category: 'Nails & Feet', duration: 50, price: 1100, interval: 30, code: 'NAIL-01' },
      { name: 'Beard Sculpt & Hot Towel Shave', category: 'Hair Services', duration: 30, price: 400, interval: 14, code: 'HAIR-03' },
    ];

    const insertService = db.prepare(`
      INSERT INTO services (id, name, code, category, description, duration_mins, cost_estimate, price, tax_rate, revisit_interval_days, is_active, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `);

    starterServices.forEach((s, idx) => {
      insertService.run(
        `srv_${Date.now()}_${idx}`,
        s.name,
        s.code,
        s.category,
        'Professional treatment tailored for optimum results.',
        s.duration,
        Math.round(s.price * 0.2),
        s.price,
        Number(taxRate) || 18.0,
        s.interval,
        now
      );
    });
  }

  // Create session
  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO sessions (token, owner_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, ownerId, now, expiresAt);

  const owner = db.prepare('SELECT id, name, email, phone, created_at FROM owners WHERE id = ?').get(ownerId);
  const salon = db.prepare('SELECT * FROM salon_settings WHERE id = ?').get(salonId) as any;
  salon.business_types = JSON.parse(salon.business_types_json);

  return res.json({ success: true, token, owner, salon });
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const ownerRow = db
    .prepare('SELECT * FROM owners WHERE email = ?')
    .get(email.trim().toLowerCase()) as any;

  if (!ownerRow) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const isValid = verifyPassword(password, ownerRow.password_hash, ownerRow.salt);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid email or password.' });
  }

  const token = generateToken();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (token, owner_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, ownerRow.id, now, expiresAt);

  const salon = db.prepare('SELECT * FROM salon_settings LIMIT 1').get() as any;
  if (salon && salon.business_types_json) {
    salon.business_types = JSON.parse(salon.business_types_json);
  }

  return res.json({
    success: true,
    token,
    owner: {
      id: ownerRow.id,
      name: ownerRow.name,
      email: ownerRow.email,
      phone: ownerRow.phone,
      created_at: ownerRow.created_at,
    },
    salon,
  });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { name, email, password, phone, businessName } = req.body;
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Name, email, and password are required.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  const existingOwner = db.prepare('SELECT id FROM owners WHERE email = ?').get(cleanEmail);
  if (existingOwner) {
    return res.status(400).json({ error: 'An account with this email address already exists. Please sign in.' });
  }

  const ownerId = 'own_' + Date.now();
  const { hash, salt } = hashPassword(password);
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO owners (id, name, email, password_hash, salt, phone, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(ownerId, name.trim(), cleanEmail, hash, salt, phone ? phone.trim() : '', now);

  // If no salon settings exist yet, create default
  let salon = db.prepare('SELECT * FROM salon_settings LIMIT 1').get() as any;
  if (!salon) {
    const salonId = 'salon_' + Date.now();
    const salonName = businessName && businessName.trim() ? businessName.trim() : `${name.trim()}'s Salon & Spa`;
    const defaultTypes = JSON.stringify(['Unisex Salon', 'Beauty Parlour']);
    db.prepare(`
      INSERT INTO salon_settings (
        id, business_name, business_types_json, tagline, address, phone, email,
        currency, tax_rate, invoice_prefix, default_duration_mins, opening_time,
        closing_time, weekly_off, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      salonId,
      salonName,
      defaultTypes,
      'Elegance & Care in Every Touch',
      '',
      phone ? phone.trim() : '',
      cleanEmail,
      'INR',
      18.0,
      'GG-',
      45,
      '09:30',
      '20:30',
      'Tuesday',
      now,
      now
    );
    salon = db.prepare('SELECT * FROM salon_settings WHERE id = ?').get(salonId);
  } else if (businessName && businessName.trim()) {
    db.prepare('UPDATE salon_settings SET business_name = ?, updated_at = ? WHERE id = ?').run(
      businessName.trim(),
      now,
      salon.id
    );
    salon.business_name = businessName.trim();
  }

  if (salon && salon.business_types_json) {
    try {
      salon.business_types = JSON.parse(salon.business_types_json);
    } catch {
      salon.business_types = [];
    }
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`
    INSERT INTO sessions (token, owner_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, ownerId, now, expiresAt);

  return res.json({
    success: true,
    token,
    owner: {
      id: ownerId,
      name: name.trim(),
      email: cleanEmail,
      phone: phone ? phone.trim() : '',
      created_at: now,
    },
    salon,
  });
});

app.post('/api/auth/google', (req: Request, res: Response) => {
  const { email, name } = req.body;
  if (!email) {
    return res.status(400).json({ error: 'Email is required from Google sign-in.' });
  }

  const cleanEmail = email.trim().toLowerCase();
  let ownerRow = db
    .prepare('SELECT * FROM owners WHERE email = ?')
    .get(cleanEmail) as any;

  const now = new Date().toISOString();

  if (!ownerRow) {
    // New user signing in with Google! Create an owner account for them seamlessly
    const ownerId = 'own_' + Date.now();
    const { hash, salt } = hashPassword(crypto.randomBytes(16).toString('hex'));
    const ownerName = (name && name.trim()) || 'Salon Owner';

    db.prepare(`
      INSERT INTO owners (id, name, email, password_hash, salt, phone, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(ownerId, ownerName, cleanEmail, hash, salt, '', now);

    ownerRow = {
      id: ownerId,
      name: ownerName,
      email: cleanEmail,
      phone: '',
      created_at: now,
    };
  }

  // Ensure salon settings exist
  let salon = db.prepare('SELECT * FROM salon_settings LIMIT 1').get() as any;
  if (!salon) {
    const salonId = 'salon_' + Date.now();
    const salonName = `${ownerRow.name}'s Salon & Spa`;
    const defaultTypes = JSON.stringify(['Unisex Salon', 'Beauty Parlour']);
    db.prepare(`
      INSERT INTO salon_settings (
        id, business_name, business_types_json, tagline, address, phone, email,
        currency, tax_rate, invoice_prefix, default_duration_mins, opening_time,
        closing_time, weekly_off, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      salonId,
      salonName,
      defaultTypes,
      'Elegance & Care in Every Touch',
      '',
      '',
      cleanEmail,
      'INR',
      18.0,
      'GG-',
      45,
      '09:30',
      '20:30',
      'Tuesday',
      now,
      now
    );
    salon = db.prepare('SELECT * FROM salon_settings WHERE id = ?').get(salonId);
  }

  const token = generateToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

  db.prepare(`
    INSERT INTO sessions (token, owner_id, created_at, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(token, ownerRow.id, now, expiresAt);

  if (salon && salon.business_types_json) {
    try {
      salon.business_types = JSON.parse(salon.business_types_json);
    } catch {
      salon.business_types = [];
    }
  }

  return res.json({
    success: true,
    token,
    owner: {
      id: ownerRow.id,
      name: ownerRow.name,
      email: ownerRow.email,
      phone: ownerRow.phone,
      created_at: ownerRow.created_at,
    },
    salon,
  });
});

app.post('/api/auth/logout', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    db.prepare('DELETE FROM sessions WHERE token = ?').run(token);
  }
  return res.json({ success: true });
});

app.post('/api/auth/reset-password', (req: Request, res: Response) => {
  const { email, phone, newPassword } = req.body;
  if (!email || !newPassword || newPassword.length < 6) {
    return res.status(400).json({ error: 'Email and valid new password (min 6 chars) are required.' });
  }

  const owner = db
    .prepare('SELECT * FROM owners WHERE email = ?')
    .get(email.trim().toLowerCase()) as any;

  if (!owner) {
    return res.status(404).json({ error: 'No owner account found with this email.' });
  }

  // If phone was provided in setup, verify it
  if (owner.phone && phone && owner.phone.replace(/\D/g, '') !== phone.replace(/\D/g, '')) {
    return res.status(400).json({ error: 'Owner phone verification failed.' });
  }

  const { hash, salt } = hashPassword(newPassword);
  db.prepare('UPDATE owners SET password_hash = ?, salt = ? WHERE id = ?').run(hash, salt, owner.id);

  // Invalidate old sessions
  db.prepare('DELETE FROM sessions WHERE owner_id = ?').run(owner.id);

  return res.json({ success: true, message: 'Password has been securely reset. Please log in.' });
});

// ---------------------------------------------------------------------------
// 2. SALON SETTINGS
// ---------------------------------------------------------------------------

app.get('/api/salon/settings', requireAuth, (req: Request, res: Response) => {
  const salon = db.prepare('SELECT * FROM salon_settings LIMIT 1').get() as any;
  if (salon && salon.business_types_json) {
    salon.business_types = JSON.parse(salon.business_types_json);
  }
  return res.json(salon);
});

app.put('/api/salon/settings', requireAuth, (req: Request, res: Response) => {
  const {
    business_name,
    business_types,
    tagline,
    address,
    phone,
    email,
    currency,
    tax_rate,
    invoice_prefix,
    default_duration_mins,
    opening_time,
    closing_time,
    weekly_off,
  } = req.body;

  const now = new Date().toISOString();
  const typesJson = JSON.stringify(Array.isArray(business_types) ? business_types : ['Unisex Salon']);

  db.prepare(`
    UPDATE salon_settings SET
      business_name = ?,
      business_types_json = ?,
      tagline = ?,
      address = ?,
      phone = ?,
      email = ?,
      currency = ?,
      tax_rate = ?,
      invoice_prefix = ?,
      default_duration_mins = ?,
      opening_time = ?,
      closing_time = ?,
      weekly_off = ?,
      updated_at = ?
    WHERE id = (SELECT id FROM salon_settings LIMIT 1)
  `).run(
    business_name,
    typesJson,
    tagline,
    address,
    phone,
    email,
    currency || 'INR',
    Number(tax_rate) || 0,
    invoice_prefix || 'GG-',
    Number(default_duration_mins) || 45,
    opening_time,
    closing_time,
    weekly_off,
    now
  );

  const updated = db.prepare('SELECT * FROM salon_settings LIMIT 1').get() as any;
  updated.business_types = JSON.parse(updated.business_types_json);
  return res.json(updated);
});

// ---------------------------------------------------------------------------
// 3. CUSTOMER MANAGEMENT
// ---------------------------------------------------------------------------

app.get('/api/customers', requireAuth, (req: Request, res: Response) => {
  const search = typeof req.query.search === 'string' ? req.query.search.trim().toLowerCase() : '';

  let query = `
    SELECT c.*,
      (SELECT COUNT(*) FROM invoices WHERE customer_id = c.id) as visit_count,
      (SELECT COALESCE(SUM(total_amount), 0) FROM invoices WHERE customer_id = c.id) as total_spent,
      (SELECT MAX(created_at) FROM invoices WHERE customer_id = c.id) as last_visit_date
    FROM customers c
  `;

  if (search) {
    query += ` WHERE LOWER(c.name) LIKE ? OR c.phone LIKE ? OR c.normalized_phone LIKE ?`;
    const term = `%${search}%`;
    const rows = db.prepare(query + ` ORDER BY c.created_at DESC`).all(term, term, term);
    return res.json(rows);
  }

  const rows = db.prepare(query + ` ORDER BY c.created_at DESC`).all();
  return res.json(rows);
});

app.post('/api/customers', requireAuth, (req: Request, res: Response) => {
  const {
    name,
    phone,
    email,
    birthday,
    gender,
    notes,
    allergies,
    marketing_consent = 1,
    whatsapp_consent = 1,
  } = req.body;

  if (!name || !phone) {
    return res.status(400).json({ error: 'Customer name and phone number are required.' });
  }

  const normalized = normalizePhoneNumber(phone);
  if (!normalized) {
    return res.status(400).json({ error: 'Please enter a valid phone number.' });
  }

  // Duplicate check
  const existing = db.prepare('SELECT id, name, phone FROM customers WHERE normalized_phone = ?').get(normalized) as any;
  if (existing) {
    return res.status(409).json({
      error: `A customer with this phone number already exists (${existing.name} - ${existing.phone}). Duplicate registration prevented.`,
      duplicateId: existing.id,
    });
  }

  const customerId = 'cust_' + Date.now();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO customers (
      id, name, phone, normalized_phone, email, birthday, gender, notes,
      allergies, marketing_consent, whatsapp_consent, loyalty_points, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?)
  `).run(
    customerId,
    name.trim(),
    phone.trim(),
    normalized,
    email ? email.trim().toLowerCase() : null,
    birthday || null,
    gender || null,
    notes || null,
    allergies || null,
    marketing_consent ? 1 : 0,
    whatsapp_consent ? 1 : 0,
    now,
    now
  );

  const created = db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId);
  return res.status(201).json(created);
});

app.get('/api/customers/:id', requireAuth, (req: Request, res: Response) => {
  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.id) as any;
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  // Fetch visit history (invoices + items)
  const invoices = db.prepare(`
    SELECT * FROM invoices WHERE customer_id = ? ORDER BY created_at DESC
  `).all(customer.id) as any[];

  for (const inv of invoices) {
    inv.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
  }

  // Fetch appointments
  const appointments = db.prepare(`
    SELECT * FROM appointments WHERE customer_id = ? ORDER BY date DESC, start_time DESC
  `).all(customer.id);

  // Fetch loyalty transactions
  const loyaltyHistory = db.prepare(`
    SELECT * FROM loyalty_ledger WHERE customer_id = ? ORDER BY created_at DESC
  `).all(customer.id);

  // Calculate next revisit based on latest service received
  let nextRevisit = null;
  const latestServiceItem = db.prepare(`
    SELECT ii.*, inv.created_at as service_date, s.revisit_interval_days
    FROM invoice_items ii
    JOIN invoices inv ON ii.invoice_id = inv.id
    LEFT JOIN services s ON ii.item_id = s.id
    WHERE inv.customer_id = ? AND ii.item_type = 'service'
    ORDER BY inv.created_at DESC LIMIT 1
  `).get(customer.id) as any;

  if (latestServiceItem) {
    const interval = latestServiceItem.revisit_interval_days || 30;
    nextRevisit = {
      serviceName: latestServiceItem.item_name,
      completedDate: latestServiceItem.service_date,
      intervalDays: interval,
      ...calculateNextRevisitDate(latestServiceItem.service_date, interval),
    };
  }

  return res.json({
    customer,
    invoices,
    appointments,
    loyaltyHistory,
    nextRevisit,
  });
});

app.put('/api/customers/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    phone,
    email,
    birthday,
    gender,
    notes,
    allergies,
    marketing_consent,
    whatsapp_consent,
  } = req.body;

  const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(id) as any;
  if (!existing) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  const normalized = normalizePhoneNumber(phone || existing.phone);
  if (normalized !== existing.normalized_phone) {
    const duplicate = db.prepare('SELECT id FROM customers WHERE normalized_phone = ? AND id != ?').get(normalized, id);
    if (duplicate) {
      return res.status(409).json({ error: 'Another customer with this phone number already exists.' });
    }
  }

  const now = new Date().toISOString();
  db.prepare(`
    UPDATE customers SET
      name = ?, phone = ?, normalized_phone = ?, email = ?, birthday = ?,
      gender = ?, notes = ?, allergies = ?, marketing_consent = ?,
      whatsapp_consent = ?, updated_at = ?
    WHERE id = ?
  `).run(
    name.trim(),
    phone.trim(),
    normalized,
    email ? email.trim().toLowerCase() : null,
    birthday || null,
    gender || null,
    notes || null,
    allergies || null,
    marketing_consent ? 1 : 0,
    whatsapp_consent ? 1 : 0,
    now,
    id
  );

  const updated = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
  return res.json(updated);
});

app.delete('/api/customers/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const invoiceCountRow = db.prepare('SELECT COUNT(*) as count FROM invoices WHERE customer_id = ?').get(id) as { count: number };
  if (invoiceCountRow.count > 0) {
    return res.status(400).json({
      error: `Cannot delete customer with ${invoiceCountRow.count} invoice records to maintain financial integrity.`,
    });
  }

  db.prepare('DELETE FROM customers WHERE id = ?').run(id);
  return res.json({ success: true });
});

// ---------------------------------------------------------------------------
// 4. SERVICE CATALOGUE
// ---------------------------------------------------------------------------

app.get('/api/services', requireAuth, (req: Request, res: Response) => {
  const services = db.prepare('SELECT * FROM services ORDER BY category ASC, name ASC').all();
  return res.json(services);
});

app.post('/api/services', requireAuth, (req: Request, res: Response) => {
  const {
    name,
    code,
    category,
    description,
    duration_mins = 30,
    cost_estimate = 0,
    price,
    tax_rate = 18.0,
    revisit_interval_days = 30,
  } = req.body;

  if (!name || price === undefined || price === null) {
    return res.status(400).json({ error: 'Service name and price are required.' });
  }

  const serviceCode = (code && code.trim()) || generateUniqueCode('SRV');
  const now = new Date().toISOString();
  const serviceId = 'srv_' + Date.now();

  try {
    db.prepare(`
      INSERT INTO services (
        id, name, code, category, description, duration_mins,
        cost_estimate, price, tax_rate, revisit_interval_days, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      serviceId,
      name.trim(),
      serviceCode,
      category || 'General Care',
      description || '',
      Number(duration_mins) || 30,
      Number(cost_estimate) || 0,
      Number(price),
      Number(tax_rate) || 18.0,
      Number(revisit_interval_days) || 30,
      now
    );

    const created = db.prepare('SELECT * FROM services WHERE id = ?').get(serviceId);
    return res.status(201).json(created);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A service with this code already exists.' });
    }
    return res.status(500).json({ error: 'Database error creating service: ' + err.message });
  }
});

app.put('/api/services/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    code,
    category,
    description,
    duration_mins,
    cost_estimate,
    price,
    tax_rate,
    revisit_interval_days,
    is_active,
  } = req.body;

  db.prepare(`
    UPDATE services SET
      name = ?, code = ?, category = ?, description = ?, duration_mins = ?,
      cost_estimate = ?, price = ?, tax_rate = ?, revisit_interval_days = ?,
      is_active = ?
    WHERE id = ?
  `).run(
    name,
    code,
    category,
    description,
    Number(duration_mins),
    Number(cost_estimate),
    Number(price),
    Number(tax_rate),
    Number(revisit_interval_days),
    is_active ? 1 : 0,
    id
  );

  const updated = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
  return res.json(updated);
});

app.delete('/api/services/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  // Soft deactivate so historical invoice items retain reference
  db.prepare('UPDATE services SET is_active = 0 WHERE id = ?').run(id);
  return res.json({ success: true });
});

// ---------------------------------------------------------------------------
// 5. PRODUCT & INVENTORY MANAGEMENT
// ---------------------------------------------------------------------------

app.get('/api/products', requireAuth, (req: Request, res: Response) => {
  const products = db.prepare(`
    SELECT p.*,
      CASE WHEN p.current_stock <= p.reorder_threshold THEN 1 ELSE 0 END as is_low_stock
    FROM products p
    ORDER BY p.name ASC
  `).all();
  return res.json(products);
});

app.post('/api/products', requireAuth, (req: Request, res: Response) => {
  const {
    name,
    sku,
    category,
    description,
    purchase_cost = 0,
    selling_price,
    current_stock = 0,
    reorder_threshold = 5,
    supplier,
  } = req.body;

  if (!name || selling_price === undefined) {
    return res.status(400).json({ error: 'Product name and selling price are required.' });
  }

  const productSku = (sku && sku.trim()) || generateUniqueCode('SKU');
  const now = new Date().toISOString();
  const productId = 'prod_' + Date.now();

  try {
    db.prepare(`
      INSERT INTO products (
        id, name, sku, category, description, purchase_cost,
        selling_price, current_stock, reorder_threshold, supplier, is_active, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
    `).run(
      productId,
      name.trim(),
      productSku,
      category || 'Retail Products',
      description || '',
      Number(purchase_cost) || 0,
      Number(selling_price),
      Number(current_stock) || 0,
      Number(reorder_threshold) || 5,
      supplier || '',
      now
    );

    if (Number(current_stock) > 0) {
      db.prepare(`
        INSERT INTO stock_movements (
          id, product_id, movement_type, quantity, previous_stock, new_stock, notes, created_at
        ) VALUES (?, ?, 'initial', ?, 0, ?, 'Initial stock registration', ?)
      `).run('sm_' + Date.now(), productId, Number(current_stock), Number(current_stock), now);
    }

    const created = db.prepare('SELECT * FROM products WHERE id = ?').get(productId);
    return res.status(201).json(created);
  } catch (err: any) {
    if (err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'A product with this SKU already exists.' });
    }
    return res.status(500).json({ error: 'Failed to create product: ' + err.message });
  }
});

app.put('/api/products/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const {
    name,
    sku,
    category,
    description,
    purchase_cost,
    selling_price,
    reorder_threshold,
    supplier,
    is_active,
  } = req.body;

  db.prepare(`
    UPDATE products SET
      name = ?, sku = ?, category = ?, description = ?, purchase_cost = ?,
      selling_price = ?, reorder_threshold = ?, supplier = ?, is_active = ?
    WHERE id = ?
  `).run(
    name,
    sku,
    category,
    description,
    Number(purchase_cost),
    Number(selling_price),
    Number(reorder_threshold),
    supplier,
    is_active ? 1 : 0,
    id
  );

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  return res.json(updated);
});

app.post('/api/products/:id/adjust-stock', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { movement_type, quantity, notes } = req.body;
  // movement_type: 'purchase' (adds stock), 'adjustment' (adds or subtracts), 'damaged' (subtracts)

  const product = db.prepare('SELECT * FROM products WHERE id = ?').get(id) as any;
  if (!product) return res.status(404).json({ error: 'Product not found.' });

  const qty = Number(quantity);
  if (isNaN(qty) || qty === 0) {
    return res.status(400).json({ error: 'Valid quantity is required.' });
  }

  let newStock = product.current_stock;
  if (movement_type === 'purchase') {
    newStock += Math.abs(qty);
  } else if (movement_type === 'damaged' || movement_type === 'waste') {
    newStock = Math.max(0, newStock - Math.abs(qty));
  } else if (movement_type === 'adjustment') {
    newStock = Math.max(0, newStock + qty);
  }

  const now = new Date().toISOString();
  db.prepare('UPDATE products SET current_stock = ? WHERE id = ?').run(newStock, id);
  db.prepare(`
    INSERT INTO stock_movements (
      id, product_id, movement_type, quantity, previous_stock, new_stock, notes, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run('sm_' + Date.now(), id, movement_type, qty, product.current_stock, newStock, notes || '', now);

  const updated = db.prepare('SELECT * FROM products WHERE id = ?').get(id);
  return res.json(updated);
});

// ---------------------------------------------------------------------------
// 6. APPOINTMENTS
// ---------------------------------------------------------------------------

app.get('/api/appointments', requireAuth, (req: Request, res: Response) => {
  const { date, month, customer_id, staff_id, status } = req.query;

  let query = `
    SELECT a.*, c.name as customer_name, c.phone as customer_phone, s.name as staff_name
    FROM appointments a
    JOIN customers c ON a.customer_id = c.id
    LEFT JOIN staff s ON a.staff_id = s.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (date) {
    query += ` AND a.date = ?`;
    params.push(date);
  } else if (month) {
    query += ` AND a.date LIKE ?`;
    params.push(`${month}%`);
  }

  if (customer_id) {
    query += ` AND a.customer_id = ?`;
    params.push(customer_id);
  }

  if (staff_id) {
    query += ` AND a.staff_id = ?`;
    params.push(staff_id);
  }

  if (status) {
    query += ` AND a.status = ?`;
    params.push(status);
  }

  query += ` ORDER BY a.date ASC, a.start_time ASC`;
  const appointments = db.prepare(query).all(...params) as any[];

  for (const appt of appointments) {
    try {
      appt.service_ids = JSON.parse(appt.service_ids_json || '[]');
    } catch {
      appt.service_ids = [];
    }
  }

  return res.json(appointments);
});

app.post('/api/appointments', requireAuth, (req: Request, res: Response) => {
  const {
    customer_id,
    staff_id,
    date,
    start_time,
    duration_mins = 45,
    notes,
    advance_paid = 0,
    service_ids = [],
    total_estimated = 0,
  } = req.body;

  if (!customer_id || !date || !start_time) {
    return res.status(400).json({ error: 'Customer, appointment date, and start time are required.' });
  }

  // Check staff conflict if staff is assigned
  if (staff_id) {
    const conflict = db.prepare(`
      SELECT id, start_time, duration_mins FROM appointments
      WHERE staff_id = ? AND date = ? AND status NOT IN ('cancelled', 'completed')
      AND start_time = ?
    `).get(staff_id, date, start_time);

    if (conflict) {
      return res.status(409).json({
        error: `Staff member already has an active appointment at ${start_time} on ${date}.`,
      });
    }
  }

  const salon = db.prepare('SELECT invoice_prefix FROM salon_settings LIMIT 1').get() as any;
  const prefix = salon?.invoice_prefix || 'GG-';
  const apptNumber = generateUniqueCode(prefix + 'APT');
  const now = new Date().toISOString();
  const apptId = 'apt_' + Date.now();

  db.prepare(`
    INSERT INTO appointments (
      id, appointment_number, customer_id, staff_id, date, start_time,
      duration_mins, status, notes, advance_paid, service_ids_json, total_estimated, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'booked', ?, ?, ?, ?, ?)
  `).run(
    apptId,
    apptNumber,
    customer_id,
    staff_id || null,
    date,
    start_time,
    Number(duration_mins),
    notes || null,
    Number(advance_paid) || 0,
    JSON.stringify(service_ids),
    Number(total_estimated) || 0,
    now
  );

  const created = db.prepare('SELECT * FROM appointments WHERE id = ?').get(apptId);
  return res.status(201).json(created);
});

app.put('/api/appointments/:id/status', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;
  const validStatuses = ['booked', 'confirmed', 'checked_in', 'in_progress', 'completed', 'cancelled', 'no_show'];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ error: 'Invalid appointment status.' });
  }

  db.prepare('UPDATE appointments SET status = ? WHERE id = ?').run(status, id);
  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  return res.json(updated);
});

app.delete('/api/appointments/:id', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  db.prepare('DELETE FROM appointments WHERE id = ?').run(id);
  return res.json({ success: true });
});

// ---------------------------------------------------------------------------
// 7. BILLING & POINT OF SALE (POS)
// ---------------------------------------------------------------------------

app.post('/api/billing/create-invoice', requireAuth, (req: Request, res: Response) => {
  const {
    customer_id,
    appointment_id,
    items, // Array<{ item_type: 'service'|'product', item_id: string, item_name: string, quantity: number, unit_price: number, staff_id?: string }>
    discount_type = 'fixed',
    discount_val = 0,
    tax_rate = 18.0,
    paid_amount = 0,
    payment_method = 'cash',
    notes,
  } = req.body;

  if (!customer_id) {
    return res.status(400).json({ error: 'Customer is required for invoice creation.' });
  }

  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'At least one service or product item is required.' });
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id) as any;
  if (!customer) {
    return res.status(404).json({ error: 'Customer not found.' });
  }

  // Pre-validate product stock before opening transaction
  for (const it of items) {
    if (it.item_type === 'product') {
      const prod = db.prepare('SELECT * FROM products WHERE id = ?').get(it.item_id) as any;
      if (!prod) {
        return res.status(404).json({ error: `Product "${it.item_name}" not found.` });
      }
      const stockCheck = validateStockAvailability(prod.current_stock, it.quantity);
      if (!stockCheck.valid) {
        return res.status(400).json({ error: `${prod.name}: ${stockCheck.error}` });
      }
    }
  }

  // Calculate totals
  const calcItems = items.map(i => ({ quantity: i.quantity, unitPrice: i.unit_price }));
  const totals = calculateInvoiceTotals(
    calcItems,
    discount_type,
    discount_val,
    tax_rate,
    paid_amount
  );

  const salon = db.prepare('SELECT invoice_prefix FROM salon_settings LIMIT 1').get() as any;
  const prefix = salon?.invoice_prefix || 'GG-';
  const invoiceNumber = generateUniqueCode(prefix + 'INV');
  const invoiceId = 'inv_' + Date.now();
  const now = new Date().toISOString();

  const status = totals.balanceDue <= 0 ? 'paid' : (totals.grandTotal > totals.balanceDue ? 'partial' : 'pending');

  // Execute ACID Transaction
  try {
    db.exec('BEGIN TRANSACTION');

    // 1. Insert invoice
    db.prepare(`
      INSERT INTO invoices (
        id, invoice_number, customer_id, appointment_id, subtotal,
        discount_type, discount_val, discount_amount, tax_rate, tax_amount,
        total_amount, paid_amount, balance_due, payment_method, status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      invoiceId,
      invoiceNumber,
      customer_id,
      appointment_id || null,
      totals.subtotal,
      discount_type,
      Number(discount_val) || 0,
      totals.discountAmount,
      Number(tax_rate) || 0,
      totals.taxAmount,
      totals.grandTotal,
      Number(paid_amount) || 0,
      totals.balanceDue,
      payment_method,
      status,
      notes || null,
      now
    );

    // 2. Insert items and handle product stock deduction
    for (const it of items) {
      const itemId = 'item_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
      const lineTotal = Math.round((Number(it.quantity) * Number(it.unit_price)) * 100) / 100;

      db.prepare(`
        INSERT INTO invoice_items (
          id, invoice_id, item_type, item_id, item_name, quantity, unit_price, staff_id, line_total
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        itemId,
        invoiceId,
        it.item_type,
        it.item_id,
        it.item_name,
        Number(it.quantity),
        Number(it.unit_price),
        it.staff_id || null,
        lineTotal
      );

      // Decrement stock for retail product sales
      if (it.item_type === 'product') {
        const prod = db.prepare('SELECT current_stock FROM products WHERE id = ?').get(it.item_id) as any;
        const newStock = prod.current_stock - Number(it.quantity);

        db.prepare('UPDATE products SET current_stock = ? WHERE id = ?').run(newStock, it.item_id);

        db.prepare(`
          INSERT INTO stock_movements (
            id, product_id, movement_type, quantity, previous_stock, new_stock, invoice_id, notes, created_at
          ) VALUES (?, ?, 'sale', ?, ?, ?, ?, 'POS Invoice Sale', ?)
        `).run(
          'sm_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
          it.item_id,
          Number(it.quantity),
          prod.current_stock,
          newStock,
          invoiceId,
          now
        );
      }
    }

    // 3. Insert payment record if payment was tendered
    if (Number(paid_amount) > 0) {
      const paymentId = 'pay_' + Date.now();
      db.prepare(`
        INSERT INTO payments (
          id, invoice_id, customer_id, amount, method, status, notes, created_at
        ) VALUES (?, ?, ?, ?, ?, 'received', 'POS Tender', ?)
      `).run(
        paymentId,
        invoiceId,
        customer_id,
        Number(paid_amount),
        payment_method,
        now
      );
    }

    // 4. Update appointment status to completed if billed from appointment
    if (appointment_id) {
      db.prepare("UPDATE appointments SET status = 'completed' WHERE id = ?").run(appointment_id);
    }

    // 5. Reward loyalty points (1 point per 100 paid)
    if (Number(paid_amount) >= 100) {
      const pointsEarned = Math.floor(Number(paid_amount) / 100);
      const newPoints = (customer.loyalty_points || 0) + pointsEarned;
      db.prepare('UPDATE customers SET loyalty_points = ? WHERE id = ?').run(newPoints, customer_id);

      db.prepare(`
        INSERT INTO loyalty_ledger (
          id, customer_id, points_change, reason, invoice_id, balance_after, created_at
        ) VALUES (?, ?, ?, 'Points earned on Invoice purchase', ?, ?, ?)
      `).run('loy_' + Date.now(), customer_id, pointsEarned, invoiceId, newPoints, now);
    }

    db.exec('COMMIT');

    // Retrieve complete invoice with items for client
    const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(invoiceId) as any;
    invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoiceId);
    invoice.customer = customer;

    return res.status(201).json(invoice);
  } catch (err: any) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Failed to create invoice: ' + err.message });
  }
});

// ---------------------------------------------------------------------------
// 8. INVOICES & PAYMENTS REGISTRY
// ---------------------------------------------------------------------------

app.get('/api/invoices', requireAuth, (req: Request, res: Response) => {
  const { customer_id, status } = req.query;
  let query = `
    SELECT i.*, c.name as customer_name, c.phone as customer_phone
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE 1=1
  `;
  const params: any[] = [];

  if (customer_id) {
    query += ' AND i.customer_id = ?';
    params.push(customer_id);
  }
  if (status) {
    query += ' AND i.status = ?';
    params.push(status);
  }

  query += ' ORDER BY i.created_at DESC';
  const invoices = db.prepare(query).all(...params) as any[];

  for (const inv of invoices) {
    inv.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(inv.id);
  }

  return res.json(invoices);
});

app.get('/api/invoices/:id', requireAuth, (req: Request, res: Response) => {
  const invoice = db.prepare(`
    SELECT i.*, c.name as customer_name, c.phone as customer_phone, c.email as customer_email, c.notes as customer_notes
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    WHERE i.id = ?
  `).get(req.params.id) as any;

  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

  invoice.items = db.prepare('SELECT * FROM invoice_items WHERE invoice_id = ?').all(invoice.id);
  invoice.payments = db.prepare('SELECT * FROM payments WHERE invoice_id = ? ORDER BY created_at ASC').all(invoice.id);
  invoice.salon = db.prepare('SELECT * FROM salon_settings LIMIT 1').get();

  return res.json(invoice);
});

app.post('/api/invoices/:id/payments', requireAuth, (req: Request, res: Response) => {
  const { id } = req.params;
  const { amount, method, notes } = req.body;

  const invoice = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id) as any;
  if (!invoice) return res.status(404).json({ error: 'Invoice not found.' });

  const payAmount = Number(amount);
  if (isNaN(payAmount) || payAmount <= 0) {
    return res.status(400).json({ error: 'A valid payment amount is required.' });
  }

  const newPaidAmount = invoice.paid_amount + payAmount;
  const newBalance = Math.max(0, invoice.total_amount - newPaidAmount);
  const newStatus = newBalance <= 0 ? 'paid' : 'partial';
  const now = new Date().toISOString();

  try {
    db.exec('BEGIN TRANSACTION');

    db.prepare(`
      UPDATE invoices SET paid_amount = ?, balance_due = ?, status = ? WHERE id = ?
    `).run(newPaidAmount, newBalance, newStatus, id);

    db.prepare(`
      INSERT INTO payments (
        id, invoice_id, customer_id, amount, method, status, notes, created_at
      ) VALUES (?, ?, ?, ?, ?, 'received', ?, ?)
    `).run('pay_' + Date.now(), id, invoice.customer_id, payAmount, method || 'cash', notes || '', now);

    db.exec('COMMIT');

    const updated = db.prepare('SELECT * FROM invoices WHERE id = ?').get(id);
    return res.json(updated);
  } catch (err: any) {
    db.exec('ROLLBACK');
    return res.status(500).json({ error: 'Payment settlement failed: ' + err.message });
  }
});

// ---------------------------------------------------------------------------
// 9. EXPENSE MANAGEMENT
// ---------------------------------------------------------------------------

app.get('/api/expenses', requireAuth, (req: Request, res: Response) => {
  const { month } = req.query;
  let query = 'SELECT * FROM expenses';
  const params: any[] = [];
  if (month) {
    query += ' WHERE date LIKE ?';
    params.push(`${month}%`);
  }
  query += ' ORDER BY date DESC, created_at DESC';
  const expenses = db.prepare(query).all(...params);
  return res.json(expenses);
});

app.post('/api/expenses', requireAuth, (req: Request, res: Response) => {
  const { title, category, amount, payment_method = 'cash', date, notes } = req.body;
  if (!title || !category || amount === undefined) {
    return res.status(400).json({ error: 'Expense title, category, and amount are required.' });
  }

  const now = new Date().toISOString();
  const expenseDate = date || now.split('T')[0];
  const expenseId = 'exp_' + Date.now();

  db.prepare(`
    INSERT INTO expenses (id, title, category, amount, payment_method, date, notes, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    expenseId,
    title.trim(),
    category,
    Number(amount),
    payment_method,
    expenseDate,
    notes || null,
    now
  );

  const created = db.prepare('SELECT * FROM expenses WHERE id = ?').get(expenseId);
  return res.status(201).json(created);
});

app.delete('/api/expenses/:id', requireAuth, (req: Request, res: Response) => {
  db.prepare('DELETE FROM expenses WHERE id = ?').run(req.params.id);
  return res.json({ success: true });
});

// ---------------------------------------------------------------------------
// 10. STAFF & ATTENDANCE
// ---------------------------------------------------------------------------

app.get('/api/staff', requireAuth, (req: Request, res: Response) => {
  const staff = db.prepare('SELECT * FROM staff ORDER BY name ASC').all();
  return res.json(staff);
});

app.post('/api/staff', requireAuth, (req: Request, res: Response) => {
  const {
    name,
    phone,
    email,
    job_title,
    assigned_categories = [],
    joining_date,
    working_hours,
    commission_percent = 5.0,
  } = req.body;

  if (!name || !job_title) {
    return res.status(400).json({ error: 'Staff name and job title are required.' });
  }

  const now = new Date().toISOString();
  const staffId = 'stf_' + Date.now();

  db.prepare(`
    INSERT INTO staff (
      id, name, phone, email, job_title, assigned_categories_json,
      joining_date, status, working_hours, commission_percent, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, 'active', ?, ?, ?)
  `).run(
    staffId,
    name.trim(),
    phone || null,
    email || null,
    job_title.trim(),
    JSON.stringify(assigned_categories),
    joining_date || now.split('T')[0],
    working_hours || '09:30 - 20:30',
    Number(commission_percent) || 0,
    now
  );

  const created = db.prepare('SELECT * FROM staff WHERE id = ?').get(staffId);
  return res.status(201).json(created);
});

app.get('/api/staff/attendance', requireAuth, (req: Request, res: Response) => {
  const date = (req.query.date as string) || new Date().toISOString().split('T')[0];
  const attendance = db.prepare(`
    SELECT sa.*, s.name as staff_name, s.job_title
    FROM staff_attendance sa
    JOIN staff s ON sa.staff_id = s.id
    WHERE sa.date = ?
  `).all(date);
  return res.json(attendance);
});

app.post('/api/staff/attendance', requireAuth, (req: Request, res: Response) => {
  const { staff_id, date, status, check_in_time, check_out_time, notes } = req.body;
  if (!staff_id) return res.status(400).json({ error: 'Staff ID is required.' });

  const attDate = date || new Date().toISOString().split('T')[0];
  const existing = db.prepare('SELECT * FROM staff_attendance WHERE staff_id = ? AND date = ?').get(staff_id, attDate) as any;

  if (existing) {
    db.prepare(`
      UPDATE staff_attendance SET status = ?, check_in_time = ?, check_out_time = ?, notes = ?
      WHERE id = ?
    `).run(status || existing.status, check_in_time || existing.check_in_time, check_out_time || existing.check_out_time, notes || existing.notes, existing.id);
  } else {
    db.prepare(`
      INSERT INTO staff_attendance (id, staff_id, date, check_in_time, check_out_time, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run('att_' + Date.now(), staff_id, attDate, check_in_time || null, check_out_time || null, status || 'present', notes || null);
  }

  const updated = db.prepare('SELECT * FROM staff_attendance WHERE staff_id = ? AND date = ?').get(staff_id, attDate);
  return res.json(updated);
});

// ---------------------------------------------------------------------------
// 11. PACKAGES & MEMBERSHIPS
// ---------------------------------------------------------------------------

app.get('/api/packages', requireAuth, (req: Request, res: Response) => {
  const packages = db.prepare('SELECT * FROM packages ORDER BY created_at DESC').all();
  return res.json(packages);
});

app.post('/api/packages', requireAuth, (req: Request, res: Response) => {
  const { name, price, validity_days = 90, included_services = [] } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: 'Package name and price are required.' });

  const id = 'pkg_' + Date.now();
  db.prepare(`
    INSERT INTO packages (id, name, price, validity_days, included_services_json, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, 1, ?)
  `).run(id, name.trim(), Number(price), Number(validity_days), JSON.stringify(included_services), new Date().toISOString());

  const created = db.prepare('SELECT * FROM packages WHERE id = ?').get(id);
  return res.status(201).json(created);
});

app.get('/api/memberships', requireAuth, (req: Request, res: Response) => {
  const memberships = db.prepare('SELECT * FROM memberships ORDER BY created_at DESC').all();
  return res.json(memberships);
});

app.post('/api/memberships', requireAuth, (req: Request, res: Response) => {
  const { name, price, validity_days = 365, discount_percent = 10, benefits = [] } = req.body;
  if (!name || price === undefined) return res.status(400).json({ error: 'Membership name and price are required.' });

  const id = 'mem_' + Date.now();
  db.prepare(`
    INSERT INTO memberships (id, name, price, validity_days, discount_percent, benefits_json, is_active, created_at)
    VALUES (?, ?, ?, ?, ?, ?, 1, ?)
  `).run(id, name.trim(), Number(price), Number(validity_days), Number(discount_percent), JSON.stringify(benefits), new Date().toISOString());

  const created = db.prepare('SELECT * FROM memberships WHERE id = ?').get(id);
  return res.status(201).json(created);
});

// ---------------------------------------------------------------------------
// 12. RETENTION SUITE & WHATSAPP RADAR
// ---------------------------------------------------------------------------

app.get('/api/retention/revisit-radar', requireAuth, (req: Request, res: Response) => {
  // Pull customers with their last completed service
  const customers = db.prepare('SELECT id, name, phone, normalized_phone, birthday FROM customers').all() as any[];
  const todayStr = new Date().toISOString().split('T')[0];

  const results: any[] = [];
  const birthdaysDueSoon: any[] = [];

  for (const c of customers) {
    // Check birthdays within 7 days
    if (c.birthday) {
      const bdayParts = c.birthday.split('-');
      if (bdayParts.length >= 2) {
        const bMonth = bdayParts[1];
        const bDay = bdayParts[2];
        const thisYearBday = `${new Date().getFullYear()}-${bMonth}-${bDay}`;
        const diffMs = new Date(thisYearBday).getTime() - new Date(todayStr).getTime();
        const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
        if (diffDays >= 0 && diffDays <= 7) {
          birthdaysDueSoon.push({
            customerId: c.id,
            customerName: c.name,
            phone: c.phone,
            birthday: c.birthday,
            daysUntil: diffDays,
          });
        }
      }
    }

    // Latest service
    const latestService = db.prepare(`
      SELECT ii.item_name, inv.created_at as service_date, s.revisit_interval_days
      FROM invoice_items ii
      JOIN invoices inv ON ii.invoice_id = inv.id
      LEFT JOIN services s ON ii.item_id = s.id
      WHERE inv.customer_id = ? AND ii.item_type = 'service'
      ORDER BY inv.created_at DESC LIMIT 1
    `).get(c.id) as any;

    if (latestService) {
      const interval = latestService.revisit_interval_days || 30;
      const calc = calculateNextRevisitDate(latestService.service_date, interval, todayStr);

      results.push({
        customerId: c.id,
        customerName: c.name,
        phone: c.phone,
        serviceName: latestService.item_name,
        completedDate: latestService.service_date.split('T')[0],
        intervalDays: interval,
        targetDate: calc.targetDate,
        daysDifference: calc.daysDifference,
        status: calc.status,
      });
    }
  }

  // Sort by urgency: overdue first, then due today, then due soon
  const orderWeight: Record<string, number> = {
    overdue: 1,
    due_today: 2,
    due_soon: 3,
    upcoming: 4,
  };
  results.sort((a, b) => (orderWeight[a.status] || 5) - (orderWeight[b.status] || 5));

  // Get recent reminder logs
  const logs = db.prepare(`
    SELECT r.*, c.name as customer_name, c.phone as customer_phone
    FROM reminders r
    JOIN customers c ON r.customer_id = c.id
    ORDER BY r.created_at DESC LIMIT 25
  `).all();

  return res.json({
    radar: results,
    birthdays: birthdaysDueSoon,
    logs,
  });
});

app.post('/api/retention/send-reminder', requireAuth, (req: Request, res: Response) => {
  const { customer_id, type = 'revisit', message_body, template_name } = req.body;
  if (!customer_id || !message_body) {
    return res.status(400).json({ error: 'Customer ID and message body are required.' });
  }

  const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(customer_id) as any;
  if (!customer) return res.status(404).json({ error: 'Customer not found.' });

  const now = new Date().toISOString();
  const reminderId = 'rem_' + Date.now();

  // Transparent simulation mode per Module 13 & 18 requirements:
  // "Do not pretend messages were sent when using simulation mode... If credentials are not configured, provide a clearly labelled simulation mode"
  db.prepare(`
    INSERT INTO reminders (id, customer_id, type, target_date, status, channel, message_body, created_at)
    VALUES (?, ?, ?, ?, 'simulated', 'whatsapp', ?, ?)
  `).run(
    reminderId,
    customer_id,
    type,
    now.split('T')[0],
    message_body,
    now
  );

  return res.json({
    success: true,
    simulated: true,
    status: 'simulated',
    reminderId,
    message: `Reminder recorded in simulation log for ${customer.name} (${customer.phone}). Live WhatsApp API requires verified Meta Cloud API credentials.`,
  });
});

// ---------------------------------------------------------------------------
// 13. DASHBOARD & FINANCIAL METRICS
// ---------------------------------------------------------------------------

app.get('/api/dashboard', requireAuth, (req: Request, res: Response) => {
  const range = (req.query.range as string) || 'today'; // today | week | month | all
  const todayStr = new Date().toISOString().split('T')[0];

  let dateFilter = '';
  const params: any[] = [];

  if (range === 'today') {
    dateFilter = " WHERE date(created_at) = date('now')";
  } else if (range === 'week') {
    dateFilter = " WHERE created_at >= date('now', '-7 days')";
  } else if (range === 'month') {
    dateFilter = " WHERE created_at >= date('now', 'start of month')";
  }

  // 1. Sales & Invoices in range
  const salesRow = db.prepare(`
    SELECT
      COALESCE(SUM(total_amount), 0) as total_sales,
      COALESCE(SUM(paid_amount), 0) as payments_received,
      COALESCE(SUM(balance_due), 0) as outstanding_balance,
      COUNT(*) as invoice_count
    FROM invoices ${dateFilter}
  `).get() as any;

  // 2. Today's sales explicitly
  const todaySalesRow = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as today_sales
    FROM invoices WHERE date(created_at) = date('now')
  `).get() as any;

  // 3. Month's sales explicitly
  const monthSalesRow = db.prepare(`
    SELECT COALESCE(SUM(total_amount), 0) as month_sales
    FROM invoices WHERE created_at >= date('now', 'start of month')
  `).get() as any;

  // 4. Expenses in range
  let expenseFilter = '';
  if (range === 'today') {
    expenseFilter = " WHERE date = date('now')";
  } else if (range === 'week') {
    expenseFilter = " WHERE date >= date('now', '-7 days')";
  } else if (range === 'month') {
    expenseFilter = " WHERE date >= date('now', 'start of month')";
  }

  const expenseRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_expenses, COUNT(*) as expense_count
    FROM expenses ${expenseFilter}
  `).get() as any;

  // 5. Cost of products sold in range
  let cogsFilter = '';
  if (range === 'today') {
    cogsFilter = " AND date(inv.created_at) = date('now')";
  } else if (range === 'week') {
    cogsFilter = " AND inv.created_at >= date('now', '-7 days')";
  } else if (range === 'month') {
    cogsFilter = " AND inv.created_at >= date('now', 'start of month')";
  }

  const cogsRow = db.prepare(`
    SELECT COALESCE(SUM(ii.quantity * p.purchase_cost), 0) as cogs
    FROM invoice_items ii
    JOIN invoices inv ON ii.invoice_id = inv.id
    JOIN products p ON ii.item_id = p.id
    WHERE ii.item_type = 'product' ${cogsFilter}
  `).get() as any;

  const grossSales = salesRow.total_sales || 0;
  const recordedExpenses = expenseRow.total_expenses || 0;
  const costOfGoodsSold = cogsRow.cogs || 0;
  const netProfitEstimate = Math.round((grossSales - recordedExpenses - costOfGoodsSold) * 100) / 100;

  // 6. Customers metrics
  const totalCustRow = db.prepare('SELECT COUNT(*) as count FROM customers').get() as { count: number };
  const newCustRow = db.prepare(`
    SELECT COUNT(*) as count FROM customers WHERE created_at >= date('now', 'start of month')
  `).get() as { count: number };

  const returningCustRow = db.prepare(`
    SELECT COUNT(DISTINCT customer_id) as count FROM invoices
    GROUP BY customer_id HAVING COUNT(*) > 1
  `).all();
  const returningCount = returningCustRow.length;

  // 7. Appointments today & upcoming
  const todayApptsRow = db.prepare(`
    SELECT COUNT(*) as count FROM appointments WHERE date = date('now')
  `).get() as { count: number };

  const upcomingApptsRow = db.prepare(`
    SELECT COUNT(*) as count FROM appointments WHERE date >= date('now') AND status IN ('booked', 'confirmed')
  `).get() as { count: number };

  const completedApptsRow = db.prepare(`
    SELECT COUNT(*) as count FROM appointments WHERE status = 'completed'
  `).get() as { count: number };

  const cancelledApptsRow = db.prepare(`
    SELECT COUNT(*) as count FROM appointments WHERE status IN ('cancelled', 'no_show')
  `).get() as { count: number };

  // 8. Catalog & Inventory status
  const servicesCount = (db.prepare('SELECT COUNT(*) as count FROM services WHERE is_active = 1').get() as any).count;
  const productsCount = (db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get() as any).count;
  const lowStockProducts = db.prepare(`
    SELECT * FROM products WHERE is_active = 1 AND current_stock <= reorder_threshold
  `).all();

  // 9. Recent invoices
  const recentInvoices = db.prepare(`
    SELECT i.*, c.name as customer_name
    FROM invoices i
    JOIN customers c ON i.customer_id = c.id
    ORDER BY i.created_at DESC LIMIT 5
  `).all();

  // 10. Revisit radar counts
  const allServices = db.prepare(`
    SELECT ii.item_name, inv.created_at as service_date, s.revisit_interval_days
    FROM invoice_items ii
    JOIN invoices inv ON ii.invoice_id = inv.id
    LEFT JOIN services s ON ii.item_id = s.id
    WHERE ii.item_type = 'service'
  `).all() as any[];

  let overdueCount = 0;
  let dueTodayCount = 0;
  let dueSoonCount = 0;

  allServices.forEach(s => {
    const calc = calculateNextRevisitDate(s.service_date, s.revisit_interval_days || 30, todayStr);
    if (calc.status === 'overdue') overdueCount++;
    else if (calc.status === 'due_today') dueTodayCount++;
    else if (calc.status === 'due_soon') dueSoonCount++;
  });

  return res.json({
    metrics: {
      todaySales: todaySalesRow.today_sales || 0,
      monthSales: monthSalesRow.month_sales || 0,
      totalSales: grossSales,
      paymentsReceived: salesRow.payments_received || 0,
      outstandingBalance: salesRow.outstanding_balance || 0,
      recordedExpenses,
      netProfitEstimate,
      totalCustomers: totalCustRow.count,
      newCustomersThisMonth: newCustRow.count,
      returningCustomers: returningCount,
      todayAppointments: todayApptsRow.count,
      upcomingAppointments: upcomingApptsRow.count,
      completedAppointments: completedApptsRow.count,
      cancelledAppointments: cancelledApptsRow.count,
      totalServices: servicesCount,
      totalProducts: productsCount,
      lowStockCount: lowStockProducts.length,
      overdueRevisits: overdueCount,
      dueTodayRevisits: dueTodayCount,
      dueSoonRevisits: dueSoonCount,
    },
    lowStockProducts,
    recentInvoices,
  });
});

// ---------------------------------------------------------------------------
// 14. REPORTS & ANALYTICS
// ---------------------------------------------------------------------------

app.get('/api/reports', requireAuth, (req: Request, res: Response) => {
  const { start_date, end_date } = req.query;

  let invoiceFilter = '';
  let expenseFilter = '';
  const paramsInv: any[] = [];
  const paramsExp: any[] = [];

  if (start_date && end_date) {
    invoiceFilter = ' WHERE date(created_at) >= ? AND date(created_at) <= ?';
    expenseFilter = ' WHERE date >= ? AND date <= ?';
    paramsInv.push(start_date, end_date);
    paramsExp.push(start_date, end_date);
  }

  const totals = db.prepare(`
    SELECT
      COALESCE(SUM(subtotal), 0) as gross_sales,
      COALESCE(SUM(discount_amount), 0) as total_discounts,
      COALESCE(SUM(tax_amount), 0) as total_tax,
      COALESCE(SUM(total_amount), 0) as net_sales,
      COALESCE(SUM(paid_amount), 0) as payments_received,
      COALESCE(SUM(balance_due), 0) as outstanding_balances,
      COUNT(*) as invoice_count
    FROM invoices ${invoiceFilter}
  `).get(...paramsInv) as any;

  const expenses = db.prepare(`
    SELECT category, COALESCE(SUM(amount), 0) as total, COUNT(*) as count
    FROM expenses ${expenseFilter}
    GROUP BY category
  `).all(...paramsExp);

  const totalExpenses = (db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM expenses ${expenseFilter}
  `).get(...paramsExp) as any).total;

  const paymentMethods = db.prepare(`
    SELECT payment_method, COALESCE(SUM(paid_amount), 0) as total, COUNT(*) as count
    FROM invoices ${invoiceFilter}
    GROUP BY payment_method
  `).all(...paramsInv);

  let invItemFilter = '';
  if (start_date && end_date) {
    invItemFilter = ' WHERE date(inv.created_at) >= ? AND date(inv.created_at) <= ?';
  }

  const categoryBreakdown = db.prepare(`
    SELECT ii.item_type, COALESCE(SUM(ii.line_total), 0) as total, COUNT(*) as count
    FROM invoice_items ii
    JOIN invoices inv ON ii.invoice_id = inv.id
    ${invItemFilter}
    GROUP BY ii.item_type
  `).all(...paramsInv);

  return res.json({
    summary: {
      ...totals,
      totalExpenses,
      estimatedProfit: Math.round((totals.net_sales - totalExpenses) * 100) / 100,
    },
    expensesByCategory: expenses,
    paymentMethods,
    categoryBreakdown,
  });
});

// ---------------------------------------------------------------------------
// VITE INTEGRATION FOR SERVING FRONTEND
// ---------------------------------------------------------------------------

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(process.cwd(), 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (_req, res) => {
        res.sendFile(path.join(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Gild & Glow ERP server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
