import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission, hashPassword } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { ResidentType, SystemRoleType, MemberStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search') || '';
    const residentType = searchParams.get('type') as ResidentType | null;

    const profiles = await prisma.residentProfile.findMany({
      where: {
        societyId: user.societyId,
        ...(residentType ? { residentType } : {}),
        ...(search ? {
          OR: [
            { user: { fullName: { contains: search, mode: 'insensitive' } } },
            { user: { phone: { contains: search } } },
            { flat: { flatNumber: { contains: search, mode: 'insensitive' } } },
          ],
        } : {}),
      },
      include: {
        user: {
          select: {
            id: true,
            fullName: true,
            phone: true,
            email: true,
            createdAt: true,
          },
        },
        flat: {
          include: {
            block: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(profiles);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const createResidentSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  flatId: z.string().uuid(),
  residentType: z.nativeEnum(ResidentType).default(ResidentType.OWNER),
  isPrimaryResident: z.boolean().default(true),
  emergencyContact: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'resident.manage')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = createResidentSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid resident payload', 'VALIDATION_ERROR', 400, parsed.error.format());

    const { fullName, phone, email, flatId, residentType, isPrimaryResident, emergencyContact } = parsed.data;
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    // Verify flat exists in society
    const flat = await prisma.flat.findFirst({
      where: { id: flatId, societyId: user.societyId },
    });
    if (!flat) return errorResponse('Flat not found in society', 'NOT_FOUND', 404);

    const defaultPasswordHash = await hashPassword('Resident@123');

    // Upsert User
    const residentUser = await prisma.user.upsert({
      where: { phone: cleanPhone },
      update: {
        fullName,
        ...(email ? { email: email.toLowerCase().trim() } : {}),
      },
      create: {
        fullName,
        phone: cleanPhone,
        email: email ? email.toLowerCase().trim() : null,
        passwordHash: defaultPasswordHash,
        isPhoneVerified: true,
      },
    });

    // Society Membership
    await prisma.societyMember.upsert({
      where: { societyId_userId: { societyId: user.societyId, userId: residentUser.id } },
      update: {
        memberType: residentType === ResidentType.TENANT ? SystemRoleType.TENANT : SystemRoleType.RESIDENT,
        status: MemberStatus.ACTIVE,
      },
      create: {
        societyId: user.societyId,
        userId: residentUser.id,
        memberType: residentType === ResidentType.TENANT ? SystemRoleType.TENANT : SystemRoleType.RESIDENT,
      },
    });

    // Resident Profile
    const profile = await prisma.residentProfile.create({
      data: {
        societyId: user.societyId,
        userId: residentUser.id,
        flatId: flat.id,
        residentType,
        isPrimaryResident,
        emergencyContact: emergencyContact || null,
      },
      include: {
        user: true,
        flat: true,
      },
    });

    // Update flat occupancy
    await prisma.flat.update({
      where: { id: flat.id },
      data: {
        occupancyStatus: residentType === ResidentType.TENANT ? 'TENANT_OCCUPIED' : 'OWNER_OCCUPIED',
      },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'RESIDENT_ASSIGNED',
      entity: 'ResidentProfile',
      entityId: profile.id,
      newValue: profile,
    });

    return successResponse(profile, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

