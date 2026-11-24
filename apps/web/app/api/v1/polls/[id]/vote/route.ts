import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { PollStatus } from '@prisma/client';

const voteSchema = z.object({
  optionId: z.string().uuid(),
});

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'poll.vote')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = voteSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Valid optionId required', 'VALIDATION_ERROR', 400);

    const { optionId } = parsed.data;

    const poll = await prisma.poll.findFirst({
      where: { id: params.id, societyId: user.societyId },
      include: { options: true },
    });

    if (!poll) return errorResponse('Poll not found', 'NOT_FOUND', 404);
    if (poll.status !== PollStatus.ACTIVE || new Date(poll.endsAt) < new Date()) {
      return errorResponse('This poll has closed for voting', 'POLL_CLOSED', 400);
    }

    const validOption = poll.options.some((o) => o.id === optionId);
    if (!validOption) return errorResponse('Invalid option for this poll', 'INVALID_OPTION', 400);

    // Check if user already voted
    const existingVote = await prisma.pollVote.findUnique({
      where: { pollId_userId: { pollId: poll.id, userId: user.id } },
    });

    if (existingVote) {
      return errorResponse('You have already voted in this poll', 'ALREADY_VOTED', 400);
    }

    // Record vote & increment count
    await prisma.$transaction([
      prisma.pollVote.create({
        data: {
          pollId: poll.id,
          optionId,
          userId: user.id,
        },
      }),
      prisma.pollOption.update({
        where: { id: optionId },
        data: { voteCount: { increment: 1 } },
      }),
    ]);

    return successResponse({ message: 'Vote recorded successfully!' });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

