import { NextRequest } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { generateReceiptNumber } from '@localos/utils';
import { PaymentMethod, PaymentGateway, PaymentStatus, InvoiceStatus } from '@prisma/client';
import { notificationHub } from '@localos/services/notifications/notification-hub';

const verifySchema = z.object({
  invoiceId: z.string().uuid(),
  razorpayOrderId: z.string(),
  razorpayPaymentId: z.string(),
  razorpaySignature: z.string().optional(),
  amountINR: z.number().positive(),
  paymentMethod: z.nativeEnum(PaymentMethod).default(PaymentMethod.UPI),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = verifySchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid verification payload', 'VALIDATION_ERROR', 400);

    const { invoiceId, razorpayOrderId, razorpayPaymentId, razorpaySignature, amountINR, paymentMethod } = parsed.data;

    const invoice = await prisma.maintenanceInvoice.findFirst({
      where: { id: invoiceId, societyId: user.societyId },
      include: {
        flat: true,
        society: true,
      },
    });

    if (!invoice) return errorResponse('Invoice not found', 'NOT_FOUND', 404);

    // Signature verification (when live secret present)
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (secret && razorpaySignature && !razorpayOrderId.startsWith('order_demo_')) {
      const generatedSignature = crypto
        .createHmac('sha256', secret)
        .update(`${razorpayOrderId}|${razorpayPaymentId}`)
        .digest('hex');

      if (generatedSignature !== razorpaySignature && process.env.NODE_ENV === 'production') {
        return errorResponse('Invalid Razorpay signature. Payment verification failed.', 'INVALID_SIGNATURE', 400);
      }
    }

    // Sequence for Receipt
    const paymentCount = await prisma.payment.count({ where: { societyId: user.societyId } });
    const receiptNumber = generateReceiptNumber(invoice.society.code, paymentCount + 1);

    // Run transaction: Create Payment + Update Invoice
    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          societyId: user.societyId!,
          invoiceId: invoice.id,
          paymentNumber: receiptNumber,
          amount: amountINR,
          paymentMethod,
          paymentGateway: PaymentGateway.RAZORPAY,
          gatewayOrderId: razorpayOrderId,
          gatewayPaymentId: razorpayPaymentId,
          gatewaySignature: razorpaySignature || null,
          status: PaymentStatus.SUCCESS,
          paidAt: new Date(),
          remarks: `Razorpay Online Payment (Ref: ${razorpayPaymentId})`,
        },
      });

      const newPaidAmount = invoice.paidAmount + amountINR;
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

      return { payment, updatedInvoice };
    });

    // Notify resident
    await notificationHub.dispatch(['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'], {
      societyId: user.societyId,
      userId: user.id,
      recipientContact: {
        email: user.email,
        phone: user.phone,
      },
      title: `Payment Received: ${receiptNumber}`,
      message: `Your payment of ₹${amountINR} for Flat ${invoice.flat.flatNumber} has been received successfully. Receipt: ${receiptNumber}.`,
      type: 'PAYMENT_RECEIVED',
      data: { paymentId: result.payment.id, receiptNumber },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'PAYMENT_VERIFIED_RAZORPAY',
      entity: 'Payment',
      entityId: result.payment.id,
      newValue: result.payment,
    });

    return successResponse({
      message: 'Payment verified and recorded successfully!',
      payment: result.payment,
      invoice: result.updatedInvoice,
      receiptNumber,
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

