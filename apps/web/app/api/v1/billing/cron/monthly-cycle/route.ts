import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
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

export async function POST(req: NextRequest) {
  try {
    // Check either admin session OR system cron header
    const cronSecretHeader = req.headers.get('x-cron-secret');
    let targetSocietyId: string | undefined;

    if (cronSecretHeader && cronSecretHeader === process.env.CRON_SECRET) {
      // System cron triggered
    } else {
      const { user, error } = await authenticateRequest(req);
      if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
      targetSocietyId = user.societyId || undefined;
    }

    // Find all active configs where auto billing is enabled
    const configs = await prisma.billingConfig.findMany({
      where: {
        isActive: true,
        autoBillingEnabled: true,
        ...(targetSocietyId ? { societyId: targetSocietyId } : {}),
      },
      include: {
        society: {
          include: {
            flats: {
              include: {
                residents: { include: { user: true } },
              },
            },
          },
        },
      },
    });

    if (configs.length === 0) {
      return successResponse({
        message: 'No societies configured for automated billing.',
        processedSocieties: 0,
        totalInvoicesCreated: 0,
      });
    }

    const now = new Date();
    const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    let totalInvoicesCreated = 0;
    let totalAutoSettled = 0;
    let totalBilledAmount = 0;
    const executionDetails: any[] = [];

    for (const config of configs) {
      const society = config.society;
      const dueDays = config.dueDaysFromIssue || 15;
      const dueDate = new Date(now.getTime() + dueDays * 24 * 60 * 60 * 1000);

      // Check if invoices for this month cycle already exist
      const existingThisMonth = await prisma.maintenanceInvoice.count({
        where: {
          societyId: society.id,
          billingPeriodStart: { gte: periodStart },
          billingPeriodEnd: { lte: periodEnd },
        },
      });

      if (existingThisMonth > 0) {
        executionDetails.push({
          society: society.name,
          status: 'SKIPPED_ALREADY_GENERATED',
          existingCount: existingThisMonth,
        });
        continue;
      }

      let societyInvoicesCount = 0;
      let societySettledCount = 0;
      let existingInvoiceCount = await prisma.maintenanceInvoice.count({ where: { societyId: society.id } });
      let existingPaymentCount = await prisma.payment.count({ where: { societyId: society.id } });

      for (const flat of society.flats) {
        existingInvoiceCount++;
        const invoiceNumber = generateInvoiceNumber(society.code, existingInvoiceCount, periodStart);
        const parkingSlotsCount = flat.parkingSlots ? flat.parkingSlots.split(',').length : 0;

        // GST Indian rule: > ₹7,500/month or society gstApplicable = 18%
        const isTaxable = !!config.gstApplicable || Boolean(config.fixedAmount && config.fixedAmount > 7500);

        const calc = calculateMaintenanceCharge({
          calculationMethod: config.calculationMethod as any,
          areaSqFt: flat.areaSqFt,
          ratePerSqFt: config.ratePerSqFt || undefined,
          fixedAmount: config.fixedAmount || undefined,
          sinkingFund: config.sinkingFundAmount,
          parkingSlotsCount,
          parkingRatePerSlot: config.parkingChargePerSlot,
          gstApplicable: isTaxable,
          gstPercentage: config.gstPercentage || 18.0,
        });

        // Line items with SAC 999598
        const lineItemsData: Array<{
          title: string;
          chargeType: LineItemChargeType;
          amount: number;
          taxRate: number;
          taxAmount: number;
          totalAmount: number;
        }> = [
          {
            title:
              config.calculationMethod === 'PER_SQFT_AREA'
                ? `Base Maintenance (${flat.areaSqFt} sq.ft @ ₹${config.ratePerSqFt}/sqft)`
                : `Fixed Maintenance (${flat.flatType})`,
            chargeType: LineItemChargeType.MAINTENANCE,
            amount: calc.baseAmount,
            taxRate: isTaxable ? config.gstPercentage || 18.0 : 0,
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

        // Advance Wallet auto-offset
        const currentAdvance = flat.advanceBalance || 0;
        let offsetFromWallet = 0;
        let newBalance = calc.totalAmount;
        let initialStatus: InvoiceStatus = InvoiceStatus.ISSUED;

        if (currentAdvance > 0) {
          offsetFromWallet = Math.min(currentAdvance, calc.totalAmount);
          newBalance = calc.totalAmount - offsetFromWallet;
          initialStatus = newBalance <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;
        }

        const invoice = await prisma.maintenanceInvoice.create({
          data: {
            societyId: society.id,
            billingConfigId: config.id,
            invoiceNumber,
            flatId: flat.id,
            billingPeriodStart: periodStart,
            billingPeriodEnd: periodEnd,
            issueDate: now,
            dueDate,
            baseAmount: calc.baseAmount,
            sinkingFund: calc.sinkingFund,
            parkingCharges: calc.parkingCharges,
            taxAmount: calc.taxAmount,
            totalAmount: calc.totalAmount,
            paidAmount: offsetFromWallet,
            balanceAmount: newBalance,
            status: initialStatus,
            notes: `Auto-generated monthly billing cycle for ${periodStart.toLocaleString('default', {
              month: 'long',
              year: 'numeric',
            })}`,
            lineItems: { create: lineItemsData },
          },
        });

        if (offsetFromWallet > 0) {
          const remainingAdvance = currentAdvance - offsetFromWallet;
          societySettledCount++;
          totalAutoSettled++;

          await prisma.flat.update({
            where: { id: flat.id },
            data: { advanceBalance: remainingAdvance },
          });

          await prisma.walletTransaction.create({
            data: {
              societyId: society.id,
              flatId: flat.id,
              amount: offsetFromWallet,
              type: WalletTxType.DEBIT,
              reason: WalletTxReason.INVOICE_OFFSET,
              balanceAfter: remainingAdvance,
              invoiceId: invoice.id,
              notes: `Auto-deducted for scheduled monthly invoice ${invoiceNumber}`,
            },
          });

          existingPaymentCount++;
          const receiptNumber = generateReceiptNumber(society.code, existingPaymentCount);

          await prisma.payment.create({
            data: {
              societyId: society.id,
              invoiceId: invoice.id,
              paymentNumber: receiptNumber,
              amount: offsetFromWallet,
              paymentMethod: PaymentMethod.ADVANCE_WALLET,
              paymentGateway: PaymentGateway.MANUAL,
              status: PaymentStatus.SUCCESS,
              paidAt: now,
              remarks: `Auto-settled from Resident Advance Wallet Balance`,
            },
          });
        }

        societyInvoicesCount++;
        totalInvoicesCreated++;
        totalBilledAmount += calc.totalAmount;

        // Notify resident
        const primaryResident = flat.residents.find((r) => r.isPrimaryResident) || flat.residents[0];
        if (primaryResident?.user) {
          const title =
            offsetFromWallet >= calc.totalAmount
              ? `Maintenance Bill Settled: ${invoiceNumber}`
              : `Maintenance Bill Generated: ${invoiceNumber}`;
          const message =
            offsetFromWallet >= calc.totalAmount
              ? `Your bill of ₹${calc.totalAmount} for flat ${flat.flatNumber} has been automatically settled from your Advance Wallet.`
              : `Monthly maintenance of ₹${calc.totalAmount} for flat ${flat.flatNumber} is due on ${dueDate.toLocaleDateString(
                  'en-IN'
                )}.`;

          await notificationHub.dispatch(['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'], {
            societyId: society.id,
            userId: primaryResident.user.id,
            recipientContact: {
              email: primaryResident.user.email,
              phone: primaryResident.user.phone,
            },
            title,
            message,
            type: 'INVOICE_GENERATED',
            data: { invoiceId: invoice.id, amount: calc.totalAmount },
          });
        }
      }

      executionDetails.push({
        society: society.name,
        status: 'SUCCESS',
        invoicesCreated: societyInvoicesCount,
        autoSettledFromWallet: societySettledCount,
      });

      await createAuditLog({
        societyId: society.id,
        action: 'CRON_MONTHLY_BILLING_EXECUTED',
        entity: 'MaintenanceInvoice',
        newValue: {
          period: periodStart.toISOString(),
          invoicesCount: societyInvoicesCount,
          autoSettledCount: societySettledCount,
        },
      });
    }

    return successResponse({
      message: `Automated recurring billing completed: ${totalInvoicesCreated} invoices generated, ${totalAutoSettled} settled from advance wallets.`,
      summary: {
        totalInvoicesCreated,
        totalAutoSettled,
        totalBilledAmount,
        executionDetails,
      },
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}
