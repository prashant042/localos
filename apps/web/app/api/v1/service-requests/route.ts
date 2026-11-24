import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { ServiceRequestStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const isResident = user.role === 'RESIDENT' || user.role === 'TENANT';

    const requests = await prisma.serviceRequest.findMany({
      where: {
        societyId: user.societyId,
        ...(isResident ? { requestedById: user.id } : {}),
      },
      include: {
        vendor: true,
        flat: true,
        requestedBy: { select: { fullName: true, phone: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(requests);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const createServiceRequestSchema = z.object({
  vendorId: z.string().uuid(),
  serviceName: z.string().min(2),
  description: z.string().min(5),
  preferredDate: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = createServiceRequestSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid request data', 'VALIDATION_ERROR', 400);

    const { vendorId, serviceName, description, preferredDate } = parsed.data;

    const profile = await prisma.residentProfile.findFirst({
      where: { societyId: user.societyId, userId: user.id },
    });

    if (!profile) return errorResponse('No flat associated with your profile', 'NO_FLAT', 400);

    const serviceRequest = await prisma.serviceRequest.create({
      data: {
        societyId: user.societyId,
        flatId: profile.flatId,
        requestedById: user.id,
        vendorId,
        serviceName,
        description,
        preferredDate: preferredDate ? new Date(preferredDate) : null,
        status: ServiceRequestStatus.REQUESTED,
      },
      include: {
        vendor: true,
        flat: true,
      },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'SERVICE_REQUESTED',
      entity: 'ServiceRequest',
      entityId: serviceRequest.id,
      newValue: serviceRequest,
    });

    return successResponse(serviceRequest, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const updateStatusSchema = z.object({
  requestId: z.string().uuid(),
  status: z.nativeEnum(ServiceRequestStatus),
  rating: z.number().min(1).max(5).optional(),
  feedback: z.string().optional(),
});

export async function PUT(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = updateStatusSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid update payload', 'VALIDATION_ERROR', 400);

    const { requestId, status, rating, feedback } = parsed.data;

    const updated = await prisma.serviceRequest.update({
      where: { id: requestId },
      data: {
        status,
        ...(rating ? { rating } : {}),
        ...(feedback ? { feedback } : {}),
      },
      include: { vendor: true, flat: true },
    });

    return successResponse(updated);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

