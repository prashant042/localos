import { test } from 'node:test';
import assert from 'node:assert/strict';
import { calculateMaintenanceCharge, generateInvoiceNumber, generateReceiptNumber, normalizeIndianPhone } from '../packages/utils/src/index.ts';
import { SYSTEM_ROLE_PERMISSIONS } from '../packages/config/src/index.ts';

test('Billing Engine: calculateMaintenanceCharge per sq.ft area with parking & sinking fund', () => {
  const result = calculateMaintenanceCharge({
    calculationMethod: 'PER_SQFT_AREA',
    areaSqFt: 1750,
    ratePerSqFt: 3.5,
    sinkingFund: 500,
    parkingSlotsCount: 2,
    parkingRatePerSlot: 250,
    gstApplicable: false,
  });

  assert.equal(result.baseAmount, 6125);
  assert.equal(result.sinkingFund, 500);
  assert.equal(result.parkingCharges, 500);
  assert.equal(result.taxAmount, 0);
  assert.equal(result.totalAmount, 7125);
});

test('Billing Engine: calculateMaintenanceCharge fixed amount with optional GST and late fee', () => {
  const result = calculateMaintenanceCharge({
    calculationMethod: 'FIXED_PER_FLAT',
    areaSqFt: 1200,
    fixedAmount: 4000,
    sinkingFund: 0,
    parkingSlotsCount: 0,
    gstApplicable: true,
    gstPercentage: 18,
    lateFee: 200,
  });

  assert.equal(result.baseAmount, 4000);
  assert.equal(result.taxAmount, 720);
  assert.equal(result.lateFee, 200);
  assert.equal(result.totalAmount, 4920);
});

test('Phone Utility: normalizeIndianPhone handles various inputs', () => {
  assert.equal(normalizeIndianPhone('9876543210'), '9876543210');
  assert.equal(normalizeIndianPhone('+91 98765 43210'), '9876543210');
  assert.equal(normalizeIndianPhone('09876543210'), '9876543210');
  assert.equal(normalizeIndianPhone('919876543210'), '9876543210');
});

test('Generators: Invoice and Receipt numbering format', () => {
  const invoiceNum = generateInvoiceNumber('GHRWA', 42, new Date('2026-11-01'));
  assert.equal(invoiceNum, 'INV-GHRWA-202611-0042');

  const receiptNum = generateReceiptNumber('GHRWA', 15, new Date('2026-11-01'));
  assert.equal(receiptNum, 'RCPT-GHRWA-202611-0015');
});

test('RBAC Matrix: Permissions assignment integrity', () => {
  const superAdminPerms = SYSTEM_ROLE_PERMISSIONS.SUPER_ADMIN;
  assert.ok(superAdminPerms.includes('superadmin.manage'));
  assert.ok(superAdminPerms.includes('billing.create'));

  const guardPerms = SYSTEM_ROLE_PERMISSIONS.GUARD;
  assert.ok(guardPerms.includes('visitor.create'));
  assert.ok(guardPerms.includes('visitor.checkout'));
  assert.ok(!guardPerms.includes('billing.create'));

  const residentPerms = SYSTEM_ROLE_PERMISSIONS.RESIDENT;
  assert.ok(residentPerms.includes('complaint.create'));
  assert.ok(residentPerms.includes('payment.collect'));
  assert.ok(!residentPerms.includes('staff.manage'));
});
