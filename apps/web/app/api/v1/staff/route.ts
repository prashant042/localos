import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { StaffRole } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const staffList = await prisma.staff.findMany({
      where: { societyId: user.societyId },
      include: {
        attendance: {
          orderBy: { date: 'desc' },
          take: 1,
        },
      },
      orderBy: { name: 'asc' },
    });

    return successResponse(staffList);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const addStaffSchema = z.object({
  name: z.string().min(2),
  phone: z.string().min(10),
  role: z.nativeEnum(StaffRole).default(StaffRole.SECURITY_GUARD),
  shiftStart: z.string().optional().default('08:00'),
  shiftEnd: z.string().optional().default('20:00'),
  idProofType: z.string().optional(),
  idProofNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'staff.manage')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = addStaffSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid staff details', 'VALIDATION_ERROR', 400);

    const { name, phone, role, shiftStart, shiftEnd, idProofType, idProofNumber } = parsed.data;
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    const staff = await prisma.staff.create({
      data: {
        societyId: user.societyId,
        name,
        phone: cleanPhone,
        role,
        shiftStart,
        shiftEnd,
        idProofType: idProofType || null,
        idProofNumber: idProofNumber || null,
      },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'STAFF_ADDED',
      entity: 'Staff',
      entityId: staff.id,
      newValue: staff,
    });

    return successResponse(staff, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

