import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { DeliveryStatus } from '@prisma/client';
import { notificationHub } from '@localos/services/notifications/notification-hub';

const deliverySchema = z.object({
  flatId: z.string().uuid(),
  company: z.string().min(2),
  deliveryPersonName: z.string().optional(),
  phone: z.string().optional(),
  status: z.nativeEnum(DeliveryStatus).default(DeliveryStatus.LEFT_AT_GATE),
  photoUrl: z.string().optional(),
});

const updateDeliverySchema = z.object({
  deliveryId: z.string().uuid(),
  status: z.nativeEnum(DeliveryStatus),
});

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as DeliveryStatus | null;
    const flatId = searchParams.get('flatId');

    // Scoping for resident
    let residentFlatIds: string[] | undefined;
    if (user.role === 'RESIDENT' || user.role === 'TENANT') {
      const profiles = await prisma.residentProfile.findMany({
        where: { societyId: user.societyId, userId: user.id },
        select: { flatId: true },
      });
      residentFlatIds = profiles.map((p) => p.flatId);
    }

    const where: any = {
      societyId: user.societyId,
      ...(status ? { status } : {}),
      ...(flatId ? { flatId } : {}),
      ...(residentFlatIds ? { flatId: { in: residentFlatIds } } : {}),
    };

    const deliveries = await prisma.deliveryLog.findMany({
      where,
      include: {
        flat: {
          select: {
            flatNumber: true,
            block: { select: { name: true } },
          },
        },
      },
      orderBy: { loggedAt: 'desc' },
      take: 50,
    });

    const pendingAtGateCount = await prisma.deliveryLog.count({
      where: {
        societyId: user.societyId,
        status: DeliveryStatus.LEFT_AT_GATE,
        ...(residentFlatIds ? { flatId: { in: residentFlatIds } } : {}),
      },
    });

    return successResponse({
      deliveries,
      pendingAtGateCount,
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'visitor.create')) return errorResponse('Forbidden: Guard permission required', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = deliverySchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid delivery payload', 'VALIDATION_ERROR', 400);

    const { flatId, company, deliveryPersonName, phone, status, photoUrl } = parsed.data;

    const flat = await prisma.flat.findFirst({
      where: { id: flatId, societyId: user.societyId },
      include: {
        residents: {
          include: { user: true },
        },
      },
    });

    if (!flat) return errorResponse('Flat not found', 'NOT_FOUND', 404);

    const delivery = await prisma.deliveryLog.create({
      data: {
        societyId: user.societyId,
        flatId: flat.id,
        company,
        deliveryPersonName: deliveryPersonName || null,
        phone: phone ? phone.replace(/[^0-9]/g, '').slice(-10) : null,
        status,
        photoUrl: photoUrl || null,
      },
      include: { flat: true },
    });

    // Notify flat residents
    for (const res of flat.residents) {
      await notificationHub.dispatch(['IN_APP', 'SMS'], {
        societyId: user.societyId,
        userId: res.user.id,
        recipientContact: {
          email: res.user.email,
          phone: res.user.phone,
        },
        title: `Package Arrived: ${company}`,
        message: `A parcel from ${company} has been logged by security. Status: ${status === 'LEFT_AT_GATE' ? 'Collected at Main Gate' : 'Handed to flat'}.`,
        type: 'SYSTEM_ALERT',
        data: { deliveryId: delivery.id },
      });

      await prisma.notification.create({
        data: {
          societyId: user.societyId,
          userId: res.user.id,
          title: `Delivery from ${company}`,
          message: status === 'LEFT_AT_GATE' ? 'Package waiting at security gate' : 'Delivered to your flat',
          type: 'SYSTEM_ALERT',
          data: { deliveryId: delivery.id },
        },
      });
    }

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'DELIVERY_LOGGED',
      entity: 'DeliveryLog',
      entityId: delivery.id,
      newValue: delivery,
    });

    return successResponse(delivery, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = updateDeliverySchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid delivery status payload', 'VALIDATION_ERROR', 400);

    const { deliveryId, status } = parsed.data;

    const delivery = await prisma.deliveryLog.findFirst({
      where: { id: deliveryId, societyId: user.societyId },
      include: { flat: true },
    });

    if (!delivery) return errorResponse('Delivery record not found', 'NOT_FOUND', 404);

    const updated = await prisma.deliveryLog.update({
      where: { id: delivery.id },
      data: { status },
      include: { flat: true },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'DELIVERY_STATUS_UPDATED',
      entity: 'DeliveryLog',
      entityId: delivery.id,
      newValue: { previousStatus: delivery.status, newStatus: status },
    });

    return successResponse({
      message: `Delivery updated to ${status}`,
      delivery: updated,
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}
