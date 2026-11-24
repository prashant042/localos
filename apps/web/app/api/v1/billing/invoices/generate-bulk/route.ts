import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { calculateMaintenanceCharge, generateInvoiceNumber, generateReceiptNumber } from '@localos/utils';
import {
  LineItemChargeType,
  InvoiceStatus,
  PaymentMethod,
  PaymentGateway,
  PaymentStatus,
  WalletTxType,
  WalletTxReason,
} from '@prisma/client';
import { notificationHub } from '@localos/services/notifications/notification-hub';

const generateBulkSchema = z.object({
  billingConfigId: z.string().uuid().optional(),
  billingPeriodStart: z.string(), // YYYY-MM-DD
  billingPeriodEnd: z.string(),   // YYYY-MM-DD
  dueDate: z.string(),            // YYYY-MM-DD
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'billing.create')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = generateBulkSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid payload', 'VALIDATION_ERROR', 400, parsed.error.format());

    const { billingConfigId, billingPeriodStart, billingPeriodEnd, dueDate, notes } = parsed.data;

    // Fetch active billing config
    const config = await prisma.billingConfig.findFirst({
      where: {
        societyId: user.societyId,
        ...(billingConfigId ? { id: billingConfigId } : { isActive: true }),
      },
    });

    if (!config) {
      return errorResponse('No active billing configuration found. Please create one first.', 'NO_CONFIG', 400);
    }

    const society = await prisma.society.findUnique({
      where: { id: user.societyId },
      select: { code: true, name: true },
    });

    // Fetch all flats in society
    const flats = await prisma.flat.findMany({
      where: { societyId: user.societyId },
      include: {
        residents: {
          include: {
            user: true,
          },
        },
      },
    });

    if (flats.length === 0) {
      return errorResponse('No flats found in society to generate invoices for.', 'NO_FLATS', 400);
    }

    const periodStart = new Date(billingPeriodStart);
    const periodEnd = new Date(billingPeriodEnd);
    const due = new Date(dueDate);

    // Get current sequences
    const existingCount = await prisma.maintenanceInvoice.count({
      where: { societyId: user.societyId },
    });
    let existingPaymentCount = await prisma.payment.count({
      where: { societyId: user.societyId },
    });

    let generatedCount = 0;
    let autoSettledFromWalletCount = 0;
    const generatedInvoices = [];

    for (let i = 0; i < flats.length; i++) {
      const flat = flats[i];
      const seq = existingCount + i + 1;
      const invoiceNumber = generateInvoiceNumber(society?.code || 'SOC', seq, periodStart);

      // Check parking slots count
      const parkingSlotsCount = flat.parkingSlots ? flat.parkingSlots.split(',').length : 0;

      const calc = calculateMaintenanceCharge({
        calculationMethod: config.calculationMethod as any,
        areaSqFt: flat.areaSqFt,
        ratePerSqFt: config.ratePerSqFt || undefined,
        fixedAmount: config.fixedAmount || undefined,
        sinkingFund: config.sinkingFundAmount,
        parkingSlotsCount,
        parkingRatePerSlot: config.parkingChargePerSlot,
        gstApplicable: config.gstApplicable,
        gstPercentage: config.gstPercentage,
      });

      // Line items array with explicit typing
      const lineItemsData: Array<{
        title: string;
        chargeType: LineItemChargeType;
        amount: number;
        taxRate: number;
        taxAmount: number;
        totalAmount: number;
      }> = [
        {
          title: config.calculationMethod === 'PER_SQFT_AREA'
            ? `Base Maintenance (${flat.areaSqFt} sq.ft @ ₹${config.ratePerSqFt}/sqft)`
            : `Fixed Maintenance Charge (${flat.flatType})`,
          chargeType: LineItemChargeType.MAINTENANCE,
          amount: calc.baseAmount,
          taxRate: config.gstApplicable ? config.gstPercentage : 0,
          taxAmount: calc.taxAmount,
          totalAmount: calc.baseAmount + calc.taxAmount,
        },
      ];

      if (calc.sinkingFund > 0) {
        lineItemsData.push({
          title: 'Sinking Fund Contribution',
          chargeType: LineItemChargeType.SINKING_FUND,
          amount: calc.sinkingFund,
          taxRate: 0,
          taxAmount: 0,
          totalAmount: calc.sinkingFund,
        });
      }

      if (calc.parkingCharges > 0) {
        lineItemsData.push({
          title: `Parking Slots (${parkingSlotsCount} slots @ ₹${config.parkingChargePerSlot}/slot)`,
          chargeType: LineItemChargeType.PARKING,
          amount: calc.parkingCharges,
          taxRate: 0,
          taxAmount: 0,
          totalAmount: calc.parkingCharges,
        });
      }

      // Check if flat has Advance Wallet balance (Credit Ledger auto-offset)
      const currentAdvance = flat.advanceBalance || 0;
      let offsetFromWallet = 0;
      let newBalanceAmount = calc.totalAmount;
      let initialStatus: InvoiceStatus = InvoiceStatus.ISSUED;

      if (currentAdvance > 0) {
        offsetFromWallet = Math.min(currentAdvance, calc.totalAmount);
        newBalanceAmount = calc.totalAmount - offsetFromWallet;
        initialStatus = newBalanceAmount <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
      }

      const invoice = await prisma.maintenanceInvoice.create({
        data: {
          societyId: user.societyId,
          billingConfigId: config.id,
          invoiceNumber,
          flatId: flat.id,
          billingPeriodStart: periodStart,
          billingPeriodEnd: periodEnd,
          issueDate: new Date(),
          dueDate: due,
          baseAmount: calc.baseAmount,
          sinkingFund: calc.sinkingFund,
          parkingCharges: calc.parkingCharges,
          taxAmount: calc.taxAmount,
          totalAmount: calc.totalAmount,
          paidAmount: offsetFromWallet,
          balanceAmount: newBalanceAmount,
          status: initialStatus,
          notes: notes || `Regular maintenance for ${periodStart.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
          lineItems: {
            create: lineItemsData,
          },
        },
      });

      // If advance balance was used, record transaction and payment receipt
      if (offsetFromWallet > 0) {
        const remainingAdvance = currentAdvance - offsetFromWallet;
        autoSettledFromWalletCount++;

        // Update flat advance balance
        await prisma.flat.update({
          where: { id: flat.id },
          data: { advanceBalance: remainingAdvance },
        });

        // Record Wallet Debit Transaction
        await prisma.walletTransaction.create({
          data: {
            societyId: user.societyId,
            flatId: flat.id,
            amount: offsetFromWallet,
            type: WalletTxType.DEBIT,
            reason: WalletTxReason.INVOICE_OFFSET,
            balanceAfter: remainingAdvance,
            invoiceId: invoice.id,
            notes: `Auto-deducted for monthly maintenance invoice ${invoiceNumber}`,
          },
        });

        // Issue formal payment record for audit
        existingPaymentCount++;
        const receiptNumber = generateReceiptNumber(society?.code || 'SOC', existingPaymentCount);

        await prisma.payment.create({
          data: {
            societyId: user.societyId,
            invoiceId: invoice.id,
            paymentNumber: receiptNumber,
            amount: offsetFromWallet,
            paymentMethod: PaymentMethod.ADVANCE_WALLET,
            paymentGateway: PaymentGateway.MANUAL,
            status: PaymentStatus.SUCCESS,
            paidAt: new Date(),
            remarks: `Auto-settled from Resident Advance Wallet Balance (₹${remainingAdvance} remaining)`,
          },
        });
      }

      generatedInvoices.push(invoice);
      generatedCount++;

      // Dispatch customized notification to primary resident if linked
      const primaryResident = flat.residents.find((r) => r.isPrimaryResident) || flat.residents[0];
      if (primaryResident?.user) {
        let notifTitle = `Maintenance Bill Generated: ${invoiceNumber}`;
        let notifMsg = `Dear Resident, maintenance dues of ₹${calc.totalAmount} for flat ${flat.flatNumber} are due by ${due.toLocaleDateString('en-IN')}. Pay via UPI in 1-click on LocalOS.`;

        if (offsetFromWallet > 0) {
          if (newBalanceAmount <= 0) {
            notifTitle = `Maintenance Settled from Advance Wallet: ${invoiceNumber}`;
            notifMsg = `Dear Resident, your monthly maintenance of ₹${calc.totalAmount} for flat ${flat.flatNumber} was automatically paid from your Advance Wallet. Remaining Wallet: ₹${currentAdvance - offsetFromWallet}.`;
          } else {
            notifTitle = `Maintenance Partially Settled: ${invoiceNumber}`;
            notifMsg = `Dear Resident, ₹${offsetFromWallet} was deducted from your Advance Wallet for flat ${flat.flatNumber}. Remaining balance due: ₹${newBalanceAmount} by ${due.toLocaleDateString('en-IN')}.`;
          }
        }

        await notificationHub.dispatch(['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'], {
          societyId: user.societyId,
          userId: primaryResident.user.id,
          recipientContact: {
            email: primaryResident.user.email,
            phone: primaryResident.user.phone,
          },
          title: notifTitle,
          message: notifMsg,
          type: 'INVOICE_GENERATED',
          data: { invoiceId: invoice.id, amount: newBalanceAmount },
        });

        // Store in DB notification table
        await prisma.notification.create({
          data: {
            societyId: user.societyId,
            userId: primaryResident.user.id,
            title: notifTitle,
            message: notifMsg,
            type: 'INVOICE_GENERATED',
            data: { invoiceId: invoice.id },
          },
        });
      }
    }

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'BULK_INVOICES_GENERATED',
      entity: 'MaintenanceInvoice',
      newValue: {
        count: generatedCount,
        autoSettledFromWalletCount,
        totalAmount: generatedInvoices.reduce((a, b) => a + b.totalAmount, 0),
      },
    });

    return successResponse({
      message: `Generated ${generatedCount} invoices successfully. ${autoSettledFromWalletCount} auto-settled from Advance Wallets.`,
      generatedCount,
      autoSettledFromWalletCount,
    }, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}
