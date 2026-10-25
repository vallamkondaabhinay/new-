/**
 * Pure salon calculation utilities: phone normalization, invoice totals,
 * revisit interval calculations, and stock checks.
 */

export interface InvoiceItemCalculationInput {
  quantity: number;
  unitPrice: number;
}

export interface InvoiceTotalsResult {
  subtotal: number;
  discountAmount: number;
  taxableAmount: number;
  taxAmount: number;
  grandTotal: number;
  balanceDue: number;
}

/**
 * Normalizes phone numbers to standard format for duplicate detection.
 * Removes spaces, dashes, dots, parentheses.
 * Ensures consistent country prefix (e.g. +91 if 10-digit Indian number).
 */
export function normalizePhoneNumber(rawPhone: string, defaultCountryCode: string = '+91'): string {
  if (!rawPhone) return '';
  const trimmed = rawPhone.trim();
  // Keep leading + if present
  const hasPlus = trimmed.startsWith('+');
  const digitsOnly = trimmed.replace(/\D/g, '');

  if (!digitsOnly) return '';

  if (hasPlus) {
    return `+${digitsOnly}`;
  }

  // If 10 digits and default is +91
  if (digitsOnly.length === 10 && defaultCountryCode === '+91') {
    return `+91${digitsOnly}`;
  }

  // If already starts with 91 and has 12 digits
  if (digitsOnly.length === 12 && digitsOnly.startsWith('91')) {
    return `+${digitsOnly}`;
  }

  // If starts with 0 and has 11 digits (e.g. 09876543210)
  if (digitsOnly.length === 11 && digitsOnly.startsWith('0')) {
    return `${defaultCountryCode}${digitsOnly.slice(1)}`;
  }

  // Default fallback
  const cleanCC = defaultCountryCode.startsWith('+') ? defaultCountryCode : `+${defaultCountryCode}`;
  return `${cleanCC}${digitsOnly}`;
}

/**
 * Calculates subtotal, discount, tax, grand total, and balance due.
 */
export function calculateInvoiceTotals(
  items: InvoiceItemCalculationInput[],
  discountType: 'percentage' | 'fixed' = 'fixed',
  discountValue: number = 0,
  taxRatePercent: number = 0,
  paidAmount: number = 0
): InvoiceTotalsResult {
  const subtotal = items.reduce((sum, item) => {
    const qty = Math.max(0, Number(item.quantity) || 0);
    const price = Math.max(0, Number(item.unitPrice) || 0);
    return sum + qty * price;
  }, 0);

  let discountAmount = 0;
  const numDiscountVal = Math.max(0, Number(discountValue) || 0);

  if (discountType === 'percentage') {
    discountAmount = (subtotal * Math.min(100, numDiscountVal)) / 100;
  } else {
    discountAmount = Math.min(subtotal, numDiscountVal);
  }

  // Round discount to 2 decimals
  discountAmount = Math.round(discountAmount * 100) / 100;

  const taxableAmount = Math.max(0, subtotal - discountAmount);
  const cleanTaxRate = Math.max(0, Number(taxRatePercent) || 0);
  const taxAmount = Math.round((taxableAmount * cleanTaxRate) / 100 * 100) / 100;

  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;
  const cleanPaid = Math.max(0, Number(paidAmount) || 0);
  const balanceDue = Math.max(0, Math.round((grandTotal - cleanPaid) * 100) / 100);

  return {
    subtotal: Math.round(subtotal * 100) / 100,
    discountAmount,
    taxableAmount: Math.round(taxableAmount * 100) / 100,
    taxAmount,
    grandTotal,
    balanceDue,
  };
}

export type RevisitUrgency = 'overdue' | 'due_today' | 'due_soon' | 'upcoming';

export interface RevisitCalculationResult {
  targetDate: string; // YYYY-MM-DD
  daysDifference: number; // positive = days until due, negative = days overdue
  status: RevisitUrgency;
}

/**
 * Computes next revisit target date and urgency status given a service completed date
 * and configured interval in days.
 */
export function calculateNextRevisitDate(
  serviceCompletedDateStr: string,
  intervalDays: number,
  todayStr?: string
): RevisitCalculationResult {
  const completedDate = new Date(serviceCompletedDateStr);
  const interval = Math.max(1, Number(intervalDays) || 30);

  const target = new Date(completedDate);
  target.setDate(target.getDate() + interval);

  const targetDateFormatted = target.toISOString().split('T')[0];
  const now = todayStr ? new Date(todayStr) : new Date();
  const todayFormatted = now.toISOString().split('T')[0];

  const diffMs = new Date(targetDateFormatted).getTime() - new Date(todayFormatted).getTime();
  const daysDiff = Math.round(diffMs / (1000 * 60 * 60 * 24));

  let status: RevisitUrgency = 'upcoming';
  if (daysDiff < 0) {
    status = 'overdue';
  } else if (daysDiff === 0) {
    status = 'due_today';
  } else if (daysDiff <= 3) {
    status = 'due_soon';
  }

  return {
    targetDate: targetDateFormatted,
    daysDifference: daysDiff,
    status,
  };
}

/**
 * Validates inventory availability before deducting stock.
 */
export function validateStockAvailability(
  currentStock: number,
  quantityToDeduct: number
): { valid: boolean; error?: string } {
  if (quantityToDeduct <= 0) {
    return { valid: false, error: 'Quantity must be greater than zero' };
  }
  if (currentStock < quantityToDeduct) {
    return {
      valid: false,
      error: `Insufficient stock: requested ${quantityToDeduct}, only ${currentStock} available`,
    };
  }
  return { valid: true };
}
