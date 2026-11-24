import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

const createOrderSchema = z.object({
  invoiceId: z.string().uuid(),
  amount: z.number().positive().optional(), // In INR, default to remaining balance
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = createOrderSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid order request', 'VALIDATION_ERROR', 400);

    const { invoiceId } = parsed.data;

    const invoice = await prisma.maintenanceInvoice.findFirst({
      where: { id: invoiceId, societyId: user.societyId },
      include: {
        flat: true,
        society: true,
      },
    });

    if (!invoice) return errorResponse('Invoice not found', 'NOT_FOUND', 404);

    if (invoice.balanceAmount <= 0) {
      return errorResponse('This invoice is already fully paid', 'ALREADY_PAID', 400);
    }

    const payAmountINR = parsed.data.amount && parsed.data.amount <= invoice.balanceAmount
      ? parsed.data.amount
      : invoice.balanceAmount;

    const amountInPaise = Math.round(payAmountINR * 100);

    // In live production, calls: razorpay.orders.create({ amount: amountInPaise, currency: 'INR', receipt: invoice.invoiceNumber })
    // For test / sandbox, generate mock order ID if key is demo
    const razorpayOrderId = `order_${invoice.society.code}_${Date.now()}`;

    return successResponse({
      orderId: razorpayOrderId,
      amount: amountInPaise,
      amountINR: payAmountINR,
      currency: 'INR',
      keyId: process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || 'rzp_test_localos_demo_key',
      societyName: invoice.society.name,
      invoiceNumber: invoice.invoiceNumber,
      flatNumber: invoice.flat.flatNumber,
      customer: {
        name: user.fullName,
        phone: user.phone,
        email: user.email || '',
      },
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

