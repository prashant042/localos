// Formatting, Math & Helper Utilities for LocalOS

/**
 * Format numeric amount into Indian Rupee format (₹ 1,50,000)
 */
export function formatINR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Format date in Indian style: "12 Nov 2026" or "12/11/2026"
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

/**
 * Format datetime: "12 Nov 2026, 04:30 PM"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '-';
  const d = typeof date === 'string' ? new Date(date) : date;
  return new Intl.DateTimeFormat('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d);
}

/**
 * Normalize Indian phone numbers to 10 digits
 */
export function normalizeIndianPhone(phone: string): string {
  const cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.length === 10) return cleaned;
  if (cleaned.length === 12 && cleaned.startsWith('91')) return cleaned.slice(2);
  if (cleaned.length === 11 && cleaned.startsWith('0')) return cleaned.slice(1);
  return cleaned;
}

/**
 * Generate invoice numbers like "INV-GHRWA-202611-0042"
 */
export function generateInvoiceNumber(societyCode: string, sequence: number, date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  return `INV-${societyCode.toUpperCase()}-${year}${month}-${seq}`;
}

/**
 * Generate receipt numbers like "RCPT-GHRWA-202611-0012"
 */
export function generateReceiptNumber(societyCode: string, sequence: number, date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const seq = String(sequence).padStart(4, '0');
  return `RCPT-${societyCode.toUpperCase()}-${year}${month}-${seq}`;
}

/**
 * Generate ticket numbers like "TKT-GHRWA-2026-0034"
 */
export function generateTicketNumber(societyCode: string, sequence: number, date = new Date()): string {
  const year = date.getFullYear();
  const seq = String(sequence).padStart(4, '0');
  return `TKT-${societyCode.toUpperCase()}-${year}-${seq}`;
}

/**
 * Calculate maintenance amount based on formula
 */
export function calculateMaintenanceCharge(params: {
  calculationMethod: 'FIXED_PER_FLAT' | 'PER_SQFT_AREA' | 'HYBRID';
  areaSqFt: number;
  ratePerSqFt?: number;
  fixedAmount?: number;
  sinkingFund?: number;
  parkingSlotsCount?: number;
  parkingRatePerSlot?: number;
  lateFee?: number;
  gstApplicable?: boolean;
  gstPercentage?: number;
}) {
  let base = 0;
  if (params.calculationMethod === 'PER_SQFT_AREA') {
    base = (params.ratePerSqFt || 0) * params.areaSqFt;
  } else if (params.calculationMethod === 'FIXED_PER_FLAT') {
    base = params.fixedAmount || 0;
  } else {
    base = (params.fixedAmount || 0) + (params.ratePerSqFt || 0) * params.areaSqFt;
  }

  const sinking = params.sinkingFund || 0;
  const parking = (params.parkingSlotsCount || 0) * (params.parkingRatePerSlot || 0);
  const subtotal = base + sinking + parking;

  let tax = 0;
  if (params.gstApplicable && params.gstPercentage) {
    tax = Math.round((subtotal * params.gstPercentage) / 100);
  }

  const late = params.lateFee || 0;
  const total = subtotal + tax + late;

  return {
    baseAmount: Math.round(base),
    sinkingFund: Math.round(sinking),
    parkingCharges: Math.round(parking),
    taxAmount: Math.round(tax),
    lateFee: Math.round(late),
    totalAmount: Math.round(total),
  };
}

