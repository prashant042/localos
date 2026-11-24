import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { VisitorStatus } from '@prisma/client';

const actionSchema = z.object({
  logId: z.string().uuid(),
  action: z.enum(['APPROVE', 'DENY']),
});

export async function PUT(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = actionSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid action', 'VALIDATION_ERROR', 400);

    const { logId, action } = parsed.data;

    const log = await prisma.visitorLog.findFirst({
      where: { id: logId, societyId: user.societyId },
      include: { visitor: true, flat: true },
    });

    if (!log) return errorResponse('Visitor request not found', 'NOT_FOUND', 404);

    const newStatus = action === 'APPROVE' ? VisitorStatus.APPROVED : VisitorStatus.REJECTED;

    const updated = await prisma.visitorLog.update({
      where: { id: log.id },
      data: { status: newStatus },
      include: { visitor: true, flat: true },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: `VISITOR_ENTRY_${action}D`,
      entity: 'VisitorLog',
      entityId: log.id,
      newValue: { status: newStatus },
    });

    return successResponse({
      message: `Visitor entry ${action.toLowerCase()}d`,
      log: updated,
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

