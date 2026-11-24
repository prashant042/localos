import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { FlatType, OccupancyStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const blockId = searchParams.get('blockId');
    const occupancy = searchParams.get('occupancyStatus') as OccupancyStatus | null;
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    const where: any = {
      societyId: user.societyId,
      ...(blockId ? { blockId } : {}),
      ...(occupancy ? { occupancyStatus: occupancy } : {}),
      ...(search ? {
        OR: [
          { flatNumber: { contains: search, mode: 'insensitive' } },
          { intercomNumber: { contains: search, mode: 'insensitive' } },
          { parkingSlots: { contains: search, mode: 'insensitive' } },
        ],
      } : {}),
    };

    const [total, flats] = await Promise.all([
      prisma.flat.count({ where }),
      prisma.flat.findMany({
        where,
        include: {
          block: true,
          residents: {
            include: {
              user: {
                select: {
                  id: true,
                  fullName: true,
                  phone: true,
                  email: true,
                },
              },
            },
          },
          _count: {
            select: { invoices: true, complaints: true },
          },
        },
        orderBy: [{ block: { name: 'asc' } }, { flatNumber: 'asc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    return successResponse(flats, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const createFlatSchema = z.object({
  blockId: z.string().uuid(),
  flatNumber: z.string().min(1),
  flatType: z.nativeEnum(FlatType).default(FlatType.BHK_2),
  areaSqFt: z.number().positive(),
  occupancyStatus: z.nativeEnum(OccupancyStatus).default(OccupancyStatus.VACANT),
  intercomNumber: z.string().optional(),
  parkingSlots: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'flat.manage')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = createFlatSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid flat data', 'VALIDATION_ERROR', 400, parsed.error.format());

    // Check duplicate
    const existing = await prisma.flat.findUnique({
      where: {
        societyId_flatNumber: {
          societyId: user.societyId,
          flatNumber: parsed.data.flatNumber,
        },
      },
    });

    if (existing) {
      return errorResponse(`Flat ${parsed.data.flatNumber} already exists in this society`, 'ALREADY_EXISTS', 400);
    }

    const flat = await prisma.flat.create({
      data: {
        societyId: user.societyId,
        blockId: parsed.data.blockId,
        flatNumber: parsed.data.flatNumber,
        flatType: parsed.data.flatType,
        areaSqFt: parsed.data.areaSqFt,
        occupancyStatus: parsed.data.occupancyStatus,
        intercomNumber: parsed.data.intercomNumber || null,
        parkingSlots: parsed.data.parkingSlots || null,
      },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'FLAT_CREATED',
      entity: 'Flat',
      entityId: flat.id,
      newValue: flat,
    });

    return successResponse(flat, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

