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

    const blocks = await prisma.block.findMany({
      where: { societyId: user.societyId },
      include: {
        _count: {
          select: { flats: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    return successResponse(blocks);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const createBlockSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'flat.manage')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = createBlockSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid payload', 'VALIDATION_ERROR', 400);

    const block = await prisma.block.create({
      data: {
        societyId: user.societyId,
        name: parsed.data.name,
        code: parsed.data.code.toUpperCase().trim(),
      },
    });

    return successResponse(block, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

