import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { SocietyStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.isSuperAdmin) return errorResponse('Forbidden: Super Admin access required', 'FORBIDDEN', 403);

    const societies = await prisma.society.findMany({
      include: {
        _count: {
          select: {
            flats: true,
            members: true,
            invoices: true,
          },
        },
        subscriptions: {
          include: { plan: true },
          take: 1,
          orderBy: { startDate: 'desc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(societies);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const createSocietySchema = z.object({
  name: z.string().min(3),
  code: z.string().min(3).max(10),
  slug: z.string().min(3),
  address: z.string().min(5),
  city: z.string().min(2),
  state: z.string().min(2),
  pincode: z.string().min(6),
  contactEmail: z.string().email(),
  contactPhone: z.string().min(10),
  gstNumber: z.string().optional(),
  planId: z.string().default('plan-growth'),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.isSuperAdmin) return errorResponse('Forbidden: Super Admin access required', 'FORBIDDEN', 403);

    const body = await req.json();
    const parsed = createSocietySchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid society data', 'VALIDATION_ERROR', 400);

    const { name, code, slug, address, city, state, pincode, contactEmail, contactPhone, gstNumber, planId } = parsed.data;

    const existing = await prisma.society.findFirst({
      where: {
        OR: [{ code: code.toUpperCase() }, { slug }],
      },
    });

    if (existing) {
      return errorResponse('Society with this code or slug already exists', 'ALREADY_EXISTS', 400);
    }

    const society = await prisma.society.create({
      data: {
        name,
        code: code.toUpperCase().trim(),
        slug: slug.toLowerCase().trim(),
        address,
        city,
        state,
        pincode,
        contactEmail,
        contactPhone,
        gstNumber: gstNumber || null,
        status: SocietyStatus.ACTIVE,
        subscriptions: {
          create: {
            planId,
            startDate: new Date(),
            endDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
            status: 'ACTIVE',
          },
        },
        moduleSettings: {
          createMany: {
            data: [
              { moduleKey: 'billing', isEnabled: true },
              { moduleKey: 'complaints', isEnabled: true },
              { moduleKey: 'gatekeeper', isEnabled: true },
              { moduleKey: 'notices', isEnabled: true },
              { moduleKey: 'polls', isEnabled: true },
              { moduleKey: 'staff', isEnabled: true },
              { moduleKey: 'vendors', isEnabled: true },
              { moduleKey: 'documents', isEnabled: true },
            ],
          },
        },
      },
      include: {
        subscriptions: { include: { plan: true } },
      },
    });

    await createAuditLog({
      societyId: society.id,
      userId: user.id,
      action: 'SOCIETY_ONBOARDED',
      entity: 'Society',
      entityId: society.id,
      newValue: society,
    });

    return successResponse(society, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

