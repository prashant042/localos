import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);

    if (!user.societyId) return errorResponse('No active society selected', 'NO_SOCIETY', 400);

    const society = await prisma.society.findUnique({
      where: { id: user.societyId },
      include: {
        _count: {
          select: {
            flats: true,
            members: true,
            invoices: true,
            complaints: true,
          },
        },
        billingConfigs: {
          where: { isActive: true },
          take: 1,
        },
        moduleSettings: true,
      },
    });

    if (!society) return errorResponse('Society not found', 'NOT_FOUND', 404);

    return successResponse(society);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const updateSocietySchema = z.object({
  name: z.string().min(3).optional(),
  address: z.string().min(5).optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  pincode: z.string().optional(),
  gstNumber: z.string().optional(),
  registrationNumber: z.string().optional(),
  contactEmail: z.string().email().optional(),
  contactPhone: z.string().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'settings.manage')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = updateSocietySchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid payload', 'VALIDATION_ERROR', 400);

    const oldSociety = await prisma.society.findUnique({ where: { id: user.societyId } });

    const updated = await prisma.society.update({
      where: { id: user.societyId },
      data: parsed.data,
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'SOCIETY_PROFILE_UPDATED',
      entity: 'Society',
      entityId: user.societyId,
      oldValue: oldSociety,
      newValue: updated,
    });

    return successResponse(updated);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

