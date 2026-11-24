import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { generateReceiptNumber } from '@localos/utils';
import {
  PaymentMethod,
  PaymentGateway,
  PaymentStatus,
  InvoiceStatus,
  WalletTxType,
  WalletTxReason,
} from '@prisma/client';
import { notificationHub } from '@localos/services/notifications/notification-hub';

const topUpWalletSchema = z.object({
  flatId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.UPI),
  referenceNumber: z.string().optional(),
  bankName: z.string().optional(),
  autoSettleInvoices: z.boolean().default(true),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const { searchParams } = new URL(req.url);
    const flatId = searchParams.get('flatId');

    // If specific flat requested
    if (flatId) {
      const flat = await prisma.flat.findFirst({
        where: { id: flatId, societyId: user.societyId },
        include: {
          block: true,
          residents: { include: { user: true } },
          walletTransactions: {
            orderBy: { createdAt: 'desc' },
            take: 20,
            include: { invoice: { select: { invoiceNumber: true } } },
          },
        },
      });

      if (!flat) return errorResponse('Flat not found', 'NOT_FOUND', 404);

      return successResponse({ flat });
    }

    // Otherwise, society-wide wallet overview
    const flatsWithBalance = await prisma.flat.findMany({
      where: {
        societyId: user.societyId,
      },
      select: {
        id: true,
        flatNumber: true,
        advanceBalance: true,
        areaSqFt: true,
        block: { select: { name: true } },
        residents: {
          where: { isPrimaryResident: true },
          select: { user: { select: { fullName: true, phone: true } } },
        },
      },
      orderBy: { advanceBalance: 'desc' },
    });

    const totalAdvanceCorpus = flatsWithBalance.reduce((sum, f) => sum + (f.advanceBalance || 0), 0);
    const flatsWithAdvanceCount = flatsWithBalance.filter((f) => f.advanceBalance > 0).length;

    // Recent transactions
    const recentTransactions = await prisma.walletTransaction.findMany({
      where: { societyId: user.societyId },
      orderBy: { createdAt: 'desc' },
      take: 20,
      include: {
        flat: { select: { flatNumber: true, block: { select: { name: true } } } },
        invoice: { select: { invoiceNumber: true } },
      },
    });

    return successResponse({
      flats: flatsWithBalance,
      summary: {
        totalAdvanceCorpus,
        flatsWithAdvanceCount,
        totalFlats: flatsWithBalance.length,
      },
      recentTransactions,
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'payment.collect')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const societyId = user.societyId;

    const body = await req.json();
    const parsed = topUpWalletSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid top-up payload', 'VALIDATION_ERROR', 400, parsed.error.format());

    const { flatId, amount, paymentMethod, referenceNumber, bankName, autoSettleInvoices, notes } = parsed.data;

    const flat = await prisma.flat.findFirst({
      where: { id: flatId, societyId },
      include: {
        society: true,
        residents: { include: { user: true } },
      },
    });

    if (!flat) return errorResponse('Flat not found', 'NOT_FOUND', 404);

    let remainingFund = amount;
    const settledInvoices: any[] = [];

    const result = await prisma.$transaction(async (tx) => {
      let currentPaymentCount = await tx.payment.count({ where: { societyId } });

      // Step 1: If autoSettleInvoices is true, settle pending invoices oldest-first (Waterfall Settlement)
      if (autoSettleInvoices) {
        const pendingInvoices = await tx.maintenanceInvoice.findMany({
          where: {
            flatId: flat.id,
            societyId,
            status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.OVERDUE, InvoiceStatus.PARTIALLY_PAID] },
            balanceAmount: { gt: 0 },
          },
          orderBy: { dueDate: 'asc' },
        });

        for (const inv of pendingInvoices) {
          if (remainingFund <= 0) break;

          const payable = Math.min(remainingFund, inv.balanceAmount);
          const newPaid = inv.paidAmount + payable;
          const newBal = inv.balanceAmount - payable;
          const newStatus = newBal <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

          currentPaymentCount++;
          const receiptNumber = generateReceiptNumber(flat.society.code, currentPaymentCount);

          const payment = await tx.payment.create({
            data: {
              societyId,
              invoiceId: inv.id,
              paymentNumber: receiptNumber,
              amount: payable,
              paymentMethod,
              paymentGateway: PaymentGateway.MANUAL,
              status: PaymentStatus.SUCCESS,
              paidAt: new Date(),
              remarks: `Direct advance deposit settlement (Ref: ${referenceNumber || 'N/A'}${bankName ? ', Bank: ' + bankName : ''})`,
            },
          });

          await tx.maintenanceInvoice.update({
            where: { id: inv.id },
            data: {
              paidAmount: newPaid,
              balanceAmount: newBal,
              status: newStatus,
            },
          });

          settledInvoices.push({
            invoiceNumber: inv.invoiceNumber,
            settledAmount: payable,
            receiptNumber,
          });

          remainingFund -= payable;
        }
      }

      // Step 2: Any remaining fund is added to Flat's Advance Balance
      const previousAdvance = flat.advanceBalance || 0;
      const newAdvance = previousAdvance + remainingFund;

      const updatedFlat = await tx.flat.update({
        where: { id: flat.id },
        data: {
          advanceBalance: newAdvance,
        },
      });

      // Step 3: Record Wallet Transaction
      const walletTx = await tx.walletTransaction.create({
        data: {
          societyId,
          flatId: flat.id,
          amount,
          type: WalletTxType.CREDIT,
          reason: WalletTxReason.ADVANCE_PAYMENT,
          balanceAfter: newAdvance,
          notes: notes || `Advance payment top-up (Allocated to dues: ₹${amount - remainingFund}, Added to Wallet: ₹${remainingFund})`,
        },
      });

      return { updatedFlat, walletTx, settledInvoices, addedToWallet: remainingFund };
    });

    // Notify resident
    const primaryResident = flat.residents.find((r) => r.isPrimaryResident) || flat.residents[0];
    if (primaryResident?.user) {
      await notificationHub.dispatch(['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'], {
        societyId,
        userId: primaryResident.user.id,
        recipientContact: {
          email: primaryResident.user.email,
          phone: primaryResident.user.phone,
        },
        title: `Advance Maintenance Payment Credited`,
        message: `Dear Resident, advance payment of ₹${amount} recorded for flat ${flat.flatNumber}. ${
          result.settledInvoices.length > 0
            ? `${result.settledInvoices.length} invoices cleared. `
            : ''
        }Current Advance Wallet Balance: ₹${result.updatedFlat.advanceBalance}.`,
        type: 'PAYMENT_RECEIVED',
        data: { flatId: flat.id, advanceBalance: result.updatedFlat.advanceBalance },
      });
    }

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'WALLET_ADVANCE_TOPUP',
      entity: 'WalletTransaction',
      entityId: result.walletTx.id,
      newValue: {
        flatNumber: flat.flatNumber,
        depositAmount: amount,
        addedToWallet: result.addedToWallet,
        settledInvoicesCount: result.settledInvoices.length,
        newBalance: result.updatedFlat.advanceBalance,
      },
    });

    return successResponse({
      message: `Advance deposit of ₹${amount} processed. ₹${result.addedToWallet} added to wallet, ${result.settledInvoices.length} pending dues settled.`,
      advanceBalance: result.updatedFlat.advanceBalance,
      settledInvoices: result.settledInvoices,
      walletTransaction: result.walletTx,
    }, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

