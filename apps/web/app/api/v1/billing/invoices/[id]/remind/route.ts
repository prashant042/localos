import { NextRequest } from 'next/server';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { notificationHub } from '@localos/services/notifications/notification-hub';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'billing.remind')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const invoice = await prisma.maintenanceInvoice.findFirst({
      where: { id: params.id, societyId: user.societyId },
      include: {
        flat: {
          include: {
            residents: {
              include: { user: true },
            },
          },
        },
      },
    });

    if (!invoice) return errorResponse('Invoice not found', 'NOT_FOUND', 404);

    const primaryResident = invoice.flat.residents[0]?.user;
    if (!primaryResident) {
      return errorResponse('No resident registered for this flat to send reminder to', 'NO_RESIDENT', 400);
    }

    // Dispatch via Notification Hub
    await notificationHub.dispatch(['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'], {
      societyId: user.societyId,
      userId: primaryResident.id,
      recipientContact: {
        email: primaryResident.email,
        phone: primaryResident.phone,
      },
      title: `Payment Reminder: ${invoice.invoiceNumber}`,
      message: `Gentle reminder: Maintenance dues of ₹${invoice.balanceAmount} for flat ${invoice.flat.flatNumber} are pending. Please pay to avoid late fee penalties.`,
      type: 'PAYMENT_OVERDUE',
      data: { invoiceId: invoice.id, balanceAmount: invoice.balanceAmount },
    });

    await prisma.notification.create({
      data: {
        societyId: user.societyId,
        userId: primaryResident.id,
        title: `Maintenance Reminder: ${invoice.invoiceNumber}`,
        message: `Outstanding balance of ₹${invoice.balanceAmount} is pending.`,
        type: 'PAYMENT_OVERDUE',
      },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'PAYMENT_REMINDER_SENT',
      entity: 'MaintenanceInvoice',
      entityId: invoice.id,
      newValue: { recipient: primaryResident.phone, balanceAmount: invoice.balanceAmount },
    });

    return successResponse({ message: `Reminder sent successfully to ${primaryResident.fullName}` });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

