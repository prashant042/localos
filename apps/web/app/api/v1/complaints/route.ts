import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { generateTicketNumber } from '@localos/utils';
import { ComplaintPriority, ComplaintStatus } from '@prisma/client';
import { notificationHub } from '@localos/services/notifications/notification-hub';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as ComplaintStatus | null;
    const priority = searchParams.get('priority') as ComplaintPriority | null;
    const categoryId = searchParams.get('categoryId');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const isResident = user.role === 'RESIDENT' || user.role === 'TENANT';

    const where: any = {
      societyId: user.societyId,
      ...(isResident ? { createdById: user.id } : {}),
      ...(status ? { status } : {}),
      ...(priority ? { priority } : {}),
      ...(categoryId ? { categoryId } : {}),
      ...(search ? {
        OR: [
          { ticketNumber: { contains: search, mode: 'insensitive' } },
          { title: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } },
          { flat: { flatNumber: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    };

    const [total, complaints] = await Promise.all([
      prisma.complaint.count({ where }),
      prisma.complaint.findMany({
        where,
        include: {
          category: true,
          flat: { include: { block: true } },
          creator: { select: { id: true, fullName: true, phone: true, email: true } },
          assignments: {
            include: {
              assignedTo: { select: { id: true, fullName: true, phone: true } },
            },
            take: 1,
            orderBy: { assignedAt: 'desc' },
          },
          comments: {
            orderBy: { createdAt: 'asc' },
            include: {
              author: { select: { id: true, fullName: true } },
            },
          },
        },
        orderBy: [{ priority: 'desc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return successResponse(complaints, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const createComplaintSchema = z.object({
  categoryId: z.string().uuid(),
  flatId: z.string().uuid().optional(),
  title: z.string().min(5),
  description: z.string().min(10),
  priority: z.nativeEnum(ComplaintPriority).default(ComplaintPriority.MEDIUM),
  locationDetails: z.string().optional(),
  photos: z.array(z.string()).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = createComplaintSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid ticket payload', 'VALIDATION_ERROR', 400, parsed.error.format());

    const { categoryId, flatId, title, description, priority, locationDetails, photos } = parsed.data;

    // Get Category to calculate SLA due date
    const category = await prisma.complaintCategory.findFirst({
      where: { id: categoryId, societyId: user.societyId },
    });

    if (!category) return errorResponse('Invalid complaint category', 'NOT_FOUND', 404);

    const society = await prisma.society.findUnique({
      where: { id: user.societyId },
      select: { code: true, name: true },
    });

    // Auto-detect flat if resident didn't pass flatId
    let targetFlatId = flatId;
    if (!targetFlatId) {
      const profile = await prisma.residentProfile.findFirst({
        where: { societyId: user.societyId, userId: user.id },
      });
      targetFlatId = profile?.flatId;
    }

    const ticketCount = await prisma.complaint.count({ where: { societyId: user.societyId } });
    const ticketNumber = generateTicketNumber(society?.code || 'SOC', ticketCount + 1);

    const dueAt = new Date(Date.now() + category.slaHours * 60 * 60 * 1000);

    const complaint = await prisma.complaint.create({
      data: {
        societyId: user.societyId,
        ticketNumber,
        flatId: targetFlatId || null,
        createdById: user.id,
        categoryId: category.id,
        title,
        description,
        priority,
        locationDetails: locationDetails || null,
        photos,
        dueAt,
        status: ComplaintStatus.OPEN,
      },
      include: {
        category: true,
        flat: true,
      },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'COMPLAINT_CREATED',
      entity: 'Complaint',
      entityId: complaint.id,
      newValue: complaint,
    });

    return successResponse(complaint, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

