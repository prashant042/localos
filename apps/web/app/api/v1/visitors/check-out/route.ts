import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { VisitorStatus } from '@prisma/client';

const checkOutSchema = z.object({
  logId: z.string().uuid(),
});

export async function PUT(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'visitor.checkout')) return errorResponse('Forbidden: Guard permission required', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = checkOutSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Valid logId is required', 'VALIDATION_ERROR', 400);

    const log = await prisma.visitorLog.findFirst({
      where: { id: parsed.data.logId, societyId: user.societyId },
    });

    if (!log) return errorResponse('Visitor log not found', 'NOT_FOUND', 404);

    const updated = await prisma.visitorLog.update({
      where: { id: log.id },
      data: {
        status: VisitorStatus.CHECKED_OUT,
        exitTime: new Date(),
      },
      include: {
        visitor: true,
        flat: true,
      },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'VISITOR_CHECK_OUT',
      entity: 'VisitorLog',
      entityId: log.id,
      newValue: { exitTime: updated.exitTime },
    });

    return successResponse(updated);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

