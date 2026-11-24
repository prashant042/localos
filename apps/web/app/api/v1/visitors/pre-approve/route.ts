import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { VisitorType, VisitorStatus } from '@prisma/client';

const preApproveSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  visitorType: z.nativeEnum(VisitorType).default(VisitorType.GUEST),
  vehicleNumber: z.string().optional(),
  purpose: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = preApproveSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid pre-approval data', 'VALIDATION_ERROR', 400);

    const { name, phone, visitorType, vehicleNumber, purpose } = parsed.data;
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    // Find resident's flat
    const profile = await prisma.residentProfile.findFirst({
      where: { societyId: user.societyId, userId: user.id },
      include: { flat: true },
    });

    if (!profile) return errorResponse('No flat associated with your profile', 'NO_FLAT', 400);

    // 4-digit check-in OTP
    const checkInOtp = Math.floor(1000 + Math.random() * 9000).toString();

    // Create or find visitor
    const visitor = await prisma.visitor.create({
      data: {
        societyId: user.societyId,
        name,
        phone: cleanPhone,
        visitorType,
        vehicleNumber: vehicleNumber ? vehicleNumber.toUpperCase().trim() : null,
      },
    });

    const log = await prisma.visitorLog.create({
      data: {
        societyId: user.societyId,
        visitorId: visitor.id,
        flatId: profile.flatId,
        purpose: purpose || 'Expected Guest',
        status: VisitorStatus.APPROVED,
        preApprovedByUserId: user.id,
        checkInOtp,
      },
      include: {
        visitor: true,
        flat: true,
      },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'VISITOR_PRE_APPROVED',
      entity: 'VisitorLog',
      entityId: log.id,
      newValue: { visitorName: name, checkInOtp },
    });

    return successResponse({
      message: 'Guest pre-approved successfully!',
      pass: {
        id: log.id,
        visitorName: name,
        visitorPhone: cleanPhone,
        flatNumber: profile.flat.flatNumber,
        checkInOtp,
        expiresIn: '24 hours',
      },
    }, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

