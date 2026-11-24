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

const manualPaymentSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod),
  referenceNumber: z.string().optional(), // Cheque number or NEFT UTR
  bankName: z.string().optional(),
  paidAt: z.string().optional(),
  remarks: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'payment.collect')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = manualPaymentSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid manual payment data', 'VALIDATION_ERROR', 400, parsed.error.format());

    const { invoiceId, amount, paymentMethod, referenceNumber, bankName, paidAt, remarks } = parsed.data;

    const invoice = await prisma.maintenanceInvoice.findFirst({
      where: { id: invoiceId, societyId: user.societyId },
      include: { society: true, flat: true },
    });

    if (!invoice) return errorResponse('Invoice not found', 'NOT_FOUND', 404);

    const paymentCount = await prisma.payment.count({ where: { societyId: user.societyId } });
    const receiptNumber = generateReceiptNumber(invoice.society.code, paymentCount + 1);

    const note = [
      remarks,
      referenceNumber ? `Ref/Cheque: ${referenceNumber}` : null,
      bankName ? `Bank: ${bankName}` : null,
      `Recorded by: ${user.fullName}`,
    ].filter(Boolean).join(' | ');

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          societyId: user.societyId!,
          invoiceId: invoice.id,
          paymentNumber: receiptNumber,
          amount,
          paymentMethod,
          paymentGateway: PaymentGateway.MANUAL,
          status: PaymentStatus.SUCCESS,
          paidAt: paidAt ? new Date(paidAt) : new Date(),
          remarks: note,
        },
      });

      const settleAmount = Math.min(amount, invoice.balanceAmount);
      const surplus = Math.max(0, amount - settleAmount);

      const newPaidAmount = invoice.paidAmount + settleAmount;
      const newBalance = Math.max(0, invoice.totalAmount - newPaidAmount);
      const newStatus = newBalance <= 0 ? InvoiceStatus.PAID : InvoiceStatus.PARTIALLY_PAID;

      const updatedInvoice = await tx.maintenanceInvoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: newPaidAmount,
          balanceAmount: newBalance,
          status: newStatus,
        },
      });

      let updatedAdvanceBalance = invoice.flat.advanceBalance || 0;
      if (surplus > 0) {
        updatedAdvanceBalance += surplus;
        await tx.flat.update({
          where: { id: invoice.flat.id },
          data: { advanceBalance: updatedAdvanceBalance },
        });

        await tx.walletTransaction.create({
          data: {
            societyId: user.societyId!,
            flatId: invoice.flat.id,
            amount: surplus,
            type: WalletTxType.CREDIT,
            reason: WalletTxReason.ADVANCE_PAYMENT,
            balanceAfter: updatedAdvanceBalance,
            invoiceId: invoice.id,
            paymentId: payment.id,
            notes: `Surplus payment credited to Advance Wallet (Total: ₹${amount}, Cleared Dues: ₹${settleAmount})`,
          },
        });
      }

      return { payment, updatedInvoice, surplus, updatedAdvanceBalance };
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'MANUAL_PAYMENT_RECORDED',
      entity: 'Payment',
      entityId: result.payment.id,
      newValue: {
        paymentId: result.payment.id,
        amount,
        surplusCreditedToWallet: result.surplus,
        flatNumber: invoice.flat.flatNumber,
      },
    });

    return successResponse({
      message: result.surplus > 0
        ? `Offline payment of ₹${amount} recorded. Invoice fully settled and ₹${result.surplus} credited to Flat Advance Wallet.`
        : `Offline payment of ₹${amount} recorded successfully.`,
      payment: result.payment,
      invoice: result.updatedInvoice,
      receiptNumber,
      surplusAddedToWallet: result.surplus,
      advanceBalance: result.updatedAdvanceBalance,
    }, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

