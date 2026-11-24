import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { ComplaintStatus } from '@prisma/client';

const assignSchema = z.object({
  assignedToId: z.string().uuid(),
  notes: z.string().optional(),
});

export async function PUT(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'complaint.assign')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = assignSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid assignment payload', 'VALIDATION_ERROR', 400);

    const { assignedToId, notes } = parsed.data;

    const complaint = await prisma.complaint.findFirst({
      where: { id: params.id, societyId: user.societyId },
    });

    if (!complaint) return errorResponse('Ticket not found', 'NOT_FOUND', 404);

    const targetUser = await prisma.user.findUnique({
      where: { id: assignedToId },
      select: { id: true, fullName: true, phone: true },
    });

    if (!targetUser) return errorResponse('Assigned user not found', 'NOT_FOUND', 404);

    const assignment = await prisma.complaintAssignment.create({
      data: {
        complaintId: complaint.id,
        assignedToId: targetUser.id,
        assignedById: user.id,
        notes: notes || null,
      },
    });

    // Update status to ASSIGNED if currently OPEN
    const updated = await prisma.complaint.update({
      where: { id: complaint.id },
      data: {
        status: complaint.status === ComplaintStatus.OPEN ? ComplaintStatus.ASSIGNED : complaint.status,
        firstResponseAt: complaint.firstResponseAt || new Date(),
      },
      include: {
        assignments: {
          include: { assignedTo: true },
        },
      },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'COMPLAINT_ASSIGNED',
      entity: 'Complaint',
      entityId: complaint.id,
      newValue: { assignedTo: targetUser.fullName, notes },
    });

    return successResponse({
      message: `Ticket assigned to ${targetUser.fullName}`,
      complaint: updated,
      assignment,
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

