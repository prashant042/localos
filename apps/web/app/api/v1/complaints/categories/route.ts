import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const categories = await prisma.complaintCategory.findMany({
      where: { societyId: user.societyId, isActive: true },
      include: {
        _count: { select: { complaints: true } },
      },
      orderBy: { name: 'asc' },
    });

    return successResponse(categories);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const createCategorySchema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
  slaHours: z.number().positive().default(48),
  icon: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'settings.manage')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = createCategorySchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid category data', 'VALIDATION_ERROR', 400);

    const category = await prisma.complaintCategory.create({
      data: {
        societyId: user.societyId,
        ...parsed.data,
      },
    });

    return successResponse(category, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

