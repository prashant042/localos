import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const isResident = user.role === 'RESIDENT' || user.role === 'TENANT';

    const comments = await prisma.complaintComment.findMany({
      where: {
        complaintId: params.id,
        ...(isResident ? { isInternal: false } : {}), // Residents do not see internal staff comments
      },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    return successResponse(comments);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const addCommentSchema = z.object({
  comment: z.string().min(1),
  attachments: z.array(z.string()).default([]),
  isInternal: z.boolean().default(false),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = addCommentSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid comment format', 'VALIDATION_ERROR', 400);

    const isResident = user.role === 'RESIDENT' || user.role === 'TENANT';

    const newComment = await prisma.complaintComment.create({
      data: {
        complaintId: params.id,
        authorId: user.id,
        comment: parsed.data.comment,
        attachments: parsed.data.attachments,
        isInternal: isResident ? false : parsed.data.isInternal,
      },
      include: {
        author: { select: { id: true, fullName: true, avatarUrl: true } },
      },
    });

    return successResponse(newComment, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

