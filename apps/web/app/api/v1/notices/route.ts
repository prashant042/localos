import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { NoticeAudience, NoticePriority } from '@prisma/client';
import { notificationHub } from '@localos/services/notifications/notification-hub';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const isOwner = user.role === 'RESIDENT';
    const isTenant = user.role === 'TENANT';
    const isCommittee = user.role === 'SOCIETY_ADMIN' || user.role === 'COMMITTEE_MEMBER';

    const audienceFilter: NoticeAudience[] = [NoticeAudience.ALL_RESIDENTS];
    if (isOwner) audienceFilter.push(NoticeAudience.OWNERS_ONLY);
    if (isTenant) audienceFilter.push(NoticeAudience.TENANTS_ONLY);
    if (isCommittee) {
      audienceFilter.push(NoticeAudience.OWNERS_ONLY, NoticeAudience.TENANTS_ONLY, NoticeAudience.COMMITTEE_ONLY);
    }

    const notices = await prisma.notice.findMany({
      where: {
        societyId: user.societyId,
        audience: { in: audienceFilter },
      },
      include: {
        publishedBy: { select: { fullName: true } },
      },
      orderBy: [{ isPinned: 'desc' }, { publishedAt: 'desc' }],
    });

    return successResponse(notices);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const createNoticeSchema = z.object({
  title: z.string().min(3),
  content: z.string().min(10),
  audience: z.nativeEnum(NoticeAudience).default(NoticeAudience.ALL_RESIDENTS),
  priority: z.nativeEnum(NoticePriority).default(NoticePriority.NORMAL),
  isPinned: z.boolean().default(false),
  attachments: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'notice.publish')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = createNoticeSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid notice data', 'VALIDATION_ERROR', 400);

    const notice = await prisma.notice.create({
      data: {
        societyId: user.societyId,
        publishedById: user.id,
        ...parsed.data,
      },
      include: {
        publishedBy: { select: { fullName: true } },
      },
    });

    // Broadcast notice notification to residents
    const residents = await prisma.societyMember.findMany({
      where: { societyId: user.societyId, status: 'ACTIVE' },
      include: { user: true },
    });

    for (const member of residents) {
      if (member.userId !== user.id) {
        await prisma.notification.create({
          data: {
            societyId: user.societyId,
            userId: member.userId,
            title: `Notice: ${notice.title}`,
            message: notice.content.substring(0, 120) + '...',
            type: 'NOTICE_PUBLISHED',
            data: { noticeId: notice.id },
          },
        }).catch(() => {});
      }
    }

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'NOTICE_PUBLISHED',
      entity: 'Notice',
      entityId: notice.id,
      newValue: notice,
    });

    return successResponse(notice, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

