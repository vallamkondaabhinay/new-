import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizePhoneNumber,
  calculateInvoiceTotals,
  calculateNextRevisitDate,
  validateStockAvailability,
} from './salonMath';

test('normalizePhoneNumber formats various raw phone inputs properly', () => {
  // Plain 10 digit Indian number
  assert.equal(normalizePhoneNumber('9876543210'), '+919876543210');

  // Spaces and hyphens
  assert.equal(normalizePhoneNumber('98765 43210'), '+919876543210');
  assert.equal(normalizePhoneNumber('+91 98765-43210'), '+919876543210');

  // Starting with 0
  assert.equal(normalizePhoneNumber('09876543210'), '+919876543210');

  // International format
  assert.equal(normalizePhoneNumber('+1 (555) 123-4567'), '+15551234567');

  // Empty string
  assert.equal(normalizePhoneNumber(''), '');
});

test('calculateInvoiceTotals calculates subtotal, percentage discounts, taxes, and balance due', () => {
  const items = [
    { quantity: 1, unitPrice: 1000 },
    { quantity: 2, unitPrice: 250 }, // 500
  ]; // Subtotal: 1500

  // 10% discount on 1500 = 150. Taxable = 1350. 18% tax on 1350 = 243. Grand Total = 1593.
  const result = calculateInvoiceTotals(items, 'percentage', 10, 18, 1000);

  assert.equal(result.subtotal, 1500);
  assert.equal(result.discountAmount, 150);
  assert.equal(result.taxableAmount, 1350);
  assert.equal(result.taxAmount, 243);
  assert.equal(result.grandTotal, 1593);
  assert.equal(result.balanceDue, 593);
});

test('calculateInvoiceTotals handles fixed discount and full payment', () => {
  const items = [{ quantity: 1, unitPrice: 500 }];
  // 50 fixed discount -> 450 taxable. 0% tax -> 450 grand total. Paid 450 -> 0 balance.
  const result = calculateInvoiceTotals(items, 'fixed', 50, 0, 450);

  assert.equal(result.subtotal, 500);
  assert.equal(result.discountAmount, 50);
  assert.equal(result.taxableAmount, 450);
  assert.equal(result.taxAmount, 0);
  assert.equal(result.grandTotal, 450);
  assert.equal(result.balanceDue, 0);
});

test('calculateNextRevisitDate calculates accurate due status', () => {
  // Service completed on 2026-10-01 with 30-day interval -> Target is 2026-10-31
  // If today is 2026-10-25 -> 6 days away -> 'upcoming'
  const upcoming = calculateNextRevisitDate('2026-10-01', 30, '2026-10-25');
  assert.equal(upcoming.targetDate, '2026-10-31');
  assert.equal(upcoming.daysDifference, 6);
  assert.equal(upcoming.status, 'upcoming');

  // Service completed on 2026-10-01 with 25-day interval -> Target is 2026-10-26 (tomorrow) -> due_soon
  const dueSoon = calculateNextRevisitDate('2026-10-01', 25, '2026-10-25');
  assert.equal(dueSoon.targetDate, '2026-10-26');
  assert.equal(dueSoon.daysDifference, 1);
  assert.equal(dueSoon.status, 'due_soon');

  // Service completed on 2026-09-25 with 30-day interval -> Target is 2026-10-25 -> due_today
  const dueToday = calculateNextRevisitDate('2026-09-25', 30, '2026-10-25');
  assert.equal(dueToday.targetDate, '2026-10-25');
  assert.equal(dueToday.daysDifference, 0);
  assert.equal(dueToday.status, 'due_today');

  // Service completed on 2026-09-01 with 30-day interval -> Target is 2026-10-01 -> overdue
  const overdue = calculateNextRevisitDate('2026-09-01', 30, '2026-10-25');
  assert.equal(overdue.daysDifference < 0, true);
  assert.equal(overdue.status, 'overdue');
});

test('validateStockAvailability checks quantities correctly', () => {
  assert.deepEqual(validateStockAvailability(10, 2), { valid: true });
  assert.deepEqual(validateStockAvailability(10, 10), { valid: true });

  const invalidZero = validateStockAvailability(10, 0);
  assert.equal(invalidZero.valid, false);

  const invalidExceed = validateStockAvailability(5, 6);
  assert.equal(invalidExceed.valid, false);
  assert.equal(invalidExceed.error?.includes('Insufficient stock'), true);
});
