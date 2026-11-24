import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma, createAuditLog } from '@/lib/prisma';
import { WebhookStatus } from '@prisma/client';

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();
    const signature = req.headers.get('x-razorpay-signature');
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;

    // Validate Signature if secret configured
    if (secret && signature) {
      const expectedSignature = crypto
        .createHmac('sha256', secret)
        .update(rawBody)
        .digest('hex');

      if (expectedSignature !== signature && process.env.NODE_ENV === 'production') {
        return NextResponse.json({ error: 'Invalid webhook signature' }, { status: 400 });
      }
    }

    const payload = JSON.parse(rawBody);
    const eventId = req.headers.get('x-razorpay-event-id') || payload.event_id || `evt_${Date.now()}`;
    const eventType = payload.event;

    // Idempotency check
    const existingEvent = await prisma.paymentWebhookEvent.findUnique({
      where: { eventId },
    });

    if (existingEvent && existingEvent.status === WebhookStatus.PROCESSED) {
      return NextResponse.json({ status: 'already_processed', eventId }, { status: 200 });
    }

    const webhookRecord = await prisma.paymentWebhookEvent.upsert({
      where: { eventId },
      update: { attempts: { increment: 1 } },
      create: {
        eventId,
        gateway: 'RAZORPAY',
        eventType,
        payload,
        status: WebhookStatus.PENDING,
      },
    });

    // Handle payment.captured
    if (eventType === 'payment.captured') {
      const paymentEntity = payload.payload?.payment?.entity;
      if (paymentEntity) {
        const orderId = paymentEntity.order_id;
        const paymentId = paymentEntity.id;
        const amountINR = paymentEntity.amount / 100;

        // Find matching pending payment
        const existingPayment = await prisma.payment.findFirst({
          where: { gatewayOrderId: orderId },
          include: { invoice: true },
        });

        if (existingPayment && existingPayment.status !== 'SUCCESS') {
          await prisma.$transaction([
            prisma.payment.update({
              where: { id: existingPayment.id },
              data: {
                status: 'SUCCESS',
                gatewayPaymentId: paymentId,
                paidAt: new Date(),
              },
            }),
            prisma.maintenanceInvoice.update({
              where: { id: existingPayment.invoiceId },
              data: {
                paidAmount: { increment: amountINR },
                balanceAmount: { decrement: amountINR },
                status: 'PAID',
              },
            }),
          ]);
        }
      }
    }

    await prisma.paymentWebhookEvent.update({
      where: { id: webhookRecord.id },
      data: {
        status: WebhookStatus.PROCESSED,
        processedAt: new Date(),
      },
    });

    return NextResponse.json({ status: 'ok', eventId }, { status: 200 });
  } catch (error: any) {
    console.error('Razorpay Webhook Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

