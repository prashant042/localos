import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { VisitorType, VisitorStatus } from '@prisma/client';
import { notificationHub } from '@localos/services/notifications/notification-hub';

const checkInSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  flatId: z.string().uuid(),
  visitorType: z.nativeEnum(VisitorType).default(VisitorType.GUEST),
  vehicleNumber: z.string().optional(),
  purpose: z.string().optional(),
  checkInOtp: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'visitor.create')) return errorResponse('Forbidden: Guard permission required', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = checkInSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid check-in details', 'VALIDATION_ERROR', 400, parsed.error.format());

    const { name, phone, flatId, visitorType, vehicleNumber, purpose, checkInOtp } = parsed.data;
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    // Verify flat exists
    const flat = await prisma.flat.findFirst({
      where: { id: flatId, societyId: user.societyId },
      include: {
        residents: {
          include: { user: true },
        },
      },
    });

    if (!flat) return errorResponse('Flat not found in society', 'NOT_FOUND', 404);

    // Upsert Visitor master record
    const visitor = await prisma.visitor.create({
      data: {
        societyId: user.societyId,
        name,
        phone: cleanPhone,
        visitorType,
        vehicleNumber: vehicleNumber ? vehicleNumber.toUpperCase().trim() : null,
      },
    });

    // Check pre-approval OTP
    let isPreApproved = false;
    let preApprovedUserId: string | null = null;

    if (checkInOtp) {
      const preApprovedLog = await prisma.visitorLog.findFirst({
        where: {
          societyId: user.societyId,
          flatId: flat.id,
          checkInOtp,
          status: VisitorStatus.APPROVED,
        },
      });

      if (preApprovedLog) {
        isPreApproved = true;
        preApprovedUserId = preApprovedLog.preApprovedByUserId;
      }
    }

    const log = await prisma.visitorLog.create({
      data: {
        societyId: user.societyId,
        visitorId: visitor.id,
        flatId: flat.id,
        guardId: user.id,
        purpose: purpose || 'Visit',
        status: isPreApproved ? VisitorStatus.APPROVED : VisitorStatus.WAITING_APPROVAL,
        preApprovedByUserId: preApprovedUserId,
      },
      include: {
        visitor: true,
        flat: true,
      },
    });

    // Notify flat residents if waiting for approval
    if (!isPreApproved) {
      for (const resident of flat.residents) {
        await notificationHub.dispatch(['IN_APP', 'SMS', 'WHATSAPP'], {
          societyId: user.societyId,
          userId: resident.user.id,
          recipientContact: {
            email: resident.user.email,
            phone: resident.user.phone,
          },
          title: `Gate Alert: Visitor for Flat ${flat.flatNumber}`,
          message: `${visitor.name} (${visitor.visitorType}) is at the main gate requesting entry for ${purpose || 'visit'}. Vehicle: ${vehicleNumber || 'None'}.`,
          type: 'VISITOR_ARRIVAL',
          data: { logId: log.id, visitorName: visitor.name },
        });

        await prisma.notification.create({
          data: {
            societyId: user.societyId,
            userId: resident.user.id,
            title: `Visitor at Gate: ${visitor.name}`,
            message: `Requesting entry to ${flat.flatNumber}. Click to approve or deny.`,
            type: 'VISITOR_ARRIVAL',
            data: { logId: log.id },
          },
        });
      }
    }

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'VISITOR_CHECK_IN',
      entity: 'VisitorLog',
      entityId: log.id,
      newValue: log,
    });

    return successResponse(log, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

