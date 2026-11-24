import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { AttendanceStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const { searchParams } = new URL(req.url);
    const dateStr = searchParams.get('date') || new Date().toISOString().split('T')[0];
    const targetDate = new Date(`${dateStr}T00:00:00.000Z`);

    const attendanceRecords = await prisma.staffAttendance.findMany({
      where: {
        societyId: user.societyId,
        date: targetDate,
      },
      include: {
        staff: true,
      },
      orderBy: { checkInTime: 'asc' },
    });

    return successResponse(attendanceRecords);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const punchSchema = z.object({
  staffId: z.string().uuid(),
  action: z.enum(['CHECK_IN', 'CHECK_OUT', 'MARK_LEAVE']),
  status: z.nativeEnum(AttendanceStatus).optional(),
  notes: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'staff.attendance')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = punchSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid attendance punch', 'VALIDATION_ERROR', 400);

    const { staffId, action, status, notes } = parsed.data;
    const today = new Date();
    const dateOnly = new Date(`${today.toISOString().split('T')[0]}T00:00:00.000Z`);

    let attendance = await prisma.staffAttendance.findUnique({
      where: { staffId_date: { staffId, date: dateOnly } },
    });

    if (action === 'CHECK_IN') {
      attendance = await prisma.staffAttendance.upsert({
        where: { staffId_date: { staffId, date: dateOnly } },
        update: { checkInTime: new Date(), status: AttendanceStatus.PRESENT, notes },
        create: {
          societyId: user.societyId,
          staffId,
          date: dateOnly,
          checkInTime: new Date(),
          status: AttendanceStatus.PRESENT,
          notes,
        },
      });
    } else if (action === 'CHECK_OUT') {
      attendance = await prisma.staffAttendance.upsert({
        where: { staffId_date: { staffId, date: dateOnly } },
        update: { checkOutTime: new Date() },
        create: {
          societyId: user.societyId,
          staffId,
          date: dateOnly,
          checkOutTime: new Date(),
          status: AttendanceStatus.PRESENT,
          notes,
        },
      });
    } else if (action === 'MARK_LEAVE') {
      attendance = await prisma.staffAttendance.upsert({
        where: { staffId_date: { staffId, date: dateOnly } },
        update: { status: status || AttendanceStatus.LEAVE, notes },
        create: {
          societyId: user.societyId,
          staffId,
          date: dateOnly,
          status: status || AttendanceStatus.LEAVE,
          notes,
        },
      });
    }

    if (!attendance) {
      return errorResponse('Invalid attendance action', 'BAD_REQUEST', 400);
    }

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: `STAFF_ATTENDANCE_${action}`,
      entity: 'StaffAttendance',
      entityId: attendance.id,
      newValue: attendance,
    });

    return successResponse(attendance);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}
