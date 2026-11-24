import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { PollStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const polls = await prisma.poll.findMany({
      where: { societyId: user.societyId },
      include: {
        options: {
          orderBy: { id: 'asc' },
        },
        votes: {
          where: { userId: user.id },
          select: { optionId: true },
        },
        _count: { select: { votes: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    const transformed = polls.map((p) => ({
      id: p.id,
      title: p.title,
      description: p.description,
      endsAt: p.endsAt,
      status: p.status,
      isAnonymous: p.isAnonymous,
      totalVotes: p._count.votes,
      userVotedOptionId: p.votes[0]?.optionId || null,
      options: p.options.map((opt) => ({
        id: opt.id,
        text: opt.text,
        voteCount: opt.voteCount,
        percentage: p._count.votes > 0 ? Math.round((opt.voteCount / p._count.votes) * 100) : 0,
      })),
    }));

    return successResponse(transformed);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const createPollSchema = z.object({
  title: z.string().min(5),
  description: z.string().optional(),
  endsAt: z.string(),
  isAnonymous: z.boolean().default(false),
  options: z.array(z.string().min(1)).min(2).max(10),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'poll.create')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = createPollSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid poll schema', 'VALIDATION_ERROR', 400);

    const { title, description, endsAt, isAnonymous, options } = parsed.data;

    const poll = await prisma.poll.create({
      data: {
        societyId: user.societyId,
        title,
        description: description || null,
        createdById: user.id,
        endsAt: new Date(endsAt),
        isAnonymous,
        status: PollStatus.ACTIVE,
        options: {
          create: options.map((opt) => ({ text: opt, voteCount: 0 })),
        },
      },
      include: {
        options: true,
      },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'POLL_CREATED',
      entity: 'Poll',
      entityId: poll.id,
      newValue: poll,
    });

    return successResponse(poll, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

