import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { ComplaintStatus } from '@prisma/client';
import { notificationHub } from '@localos/services/notifications/notification-hub';

const updateStatusSchema = z.object({
  status: z.nativeEnum(ComplaintStatus),
  resolutionNote: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid status payload', 'VALIDATION_ERROR', 400);

    const { status, resolutionNote } = parsed.data;

    const existing = await prisma.complaint.findFirst({
      where: { id: params.id, societyId: user.societyId },
      include: { creator: true },
    });

    if (!existing) return errorResponse('Complaint ticket not found', 'NOT_FOUND', 404);

    const updateData: any = {
      status,
      resolutionNote: resolutionNote || existing.resolutionNote,
    };

    if (status === ComplaintStatus.RESOLVED && !existing.resolvedAt) {
      updateData.resolvedAt = new Date();
    }
    if (status === ComplaintStatus.CLOSED && !existing.closedAt) {
      updateData.closedAt = new Date();
    }
    if (status === ComplaintStatus.REOPENED) {
      updateData.reopenCount = { increment: 1 };
    }
    if (!existing.firstResponseAt && status !== ComplaintStatus.OPEN) {
      updateData.firstResponseAt = new Date();
    }

    const updated = await prisma.complaint.update({
      where: { id: existing.id },
      data: updateData,
    });

    // Notify ticket creator
    await notificationHub.dispatch(['IN_APP', 'EMAIL', 'SMS', 'WHATSAPP'], {
      societyId: user.societyId,
      userId: existing.creator.id,
      recipientContact: {
        email: existing.creator.email,
        phone: existing.creator.phone,
      },
      title: `Complaint Updated: ${existing.ticketNumber}`,
      message: `Status changed to ${status}. ${resolutionNote ? `Note: ${resolutionNote}` : ''}`,
      type: 'COMPLAINT_UPDATE',
      data: { complaintId: existing.id, status },
    });

    await prisma.notification.create({
      data: {
        societyId: user.societyId,
        userId: existing.creator.id,
        title: `Ticket ${existing.ticketNumber}: ${status}`,
        message: resolutionNote || `Status updated to ${status}`,
        type: 'COMPLAINT_UPDATE',
      },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: `COMPLAINT_STATUS_${status}`,
      entity: 'Complaint',
      entityId: existing.id,
      oldValue: { status: existing.status },
      newValue: { status, resolutionNote },
    });

    return successResponse(updated);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

