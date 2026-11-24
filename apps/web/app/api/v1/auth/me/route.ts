import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { user, impersonatedByUserId, error } = await authenticateRequest(req);
    if (!user || error) {
      return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    }

    // Fetch user's available societies
    const dbUser = await prisma.user.findUnique({
      where: { id: user.id },
      include: {
        memberships: {
          include: {
            society: {
              select: {
                id: true,
                name: true,
                code: true,
                slug: true,
                status: true,
              },
            },
          },
        },
        residentProfiles: {
          where: { societyId: user.societyId || undefined },
          include: {
            flat: true,
          },
        },
      },
    });

    const flatInfo = dbUser?.residentProfiles[0]?.flat;

    return successResponse({
      user,
      impersonatedByUserId,
      societies: dbUser?.memberships.map(m => ({
        society: m.society,
        memberType: m.memberType,
        joinedAt: m.joinedAt,
      })) || [],
      flat: flatInfo ? {
        id: flatInfo.id,
        flatNumber: flatInfo.flatNumber,
        areaSqFt: flatInfo.areaSqFt,
        flatType: flatInfo.flatType,
        parkingSlots: flatInfo.parkingSlots,
      } : null,
    });
  } catch (error: any) {
    console.error('Auth Me error:', error);
    return errorResponse('Failed to fetch profile', 'SERVER_ERROR', 500);
  }
}

