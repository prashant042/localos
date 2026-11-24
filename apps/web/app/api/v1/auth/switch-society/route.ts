import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, generateToken, getAuthUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';

const switchSchema = z.object({
  societyId: z.string().uuid(),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) {
      return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    }

    const body = await req.json();
    const parsed = switchSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Valid societyId is required', 'VALIDATION_ERROR', 400);
    }

    const { societyId } = parsed.data;

    // Check membership unless super admin
    if (!user.isSuperAdmin) {
      const membership = await prisma.societyMember.findUnique({
        where: { societyId_userId: { societyId, userId: user.id } },
      });
      if (!membership) {
        return errorResponse('User is not a member of this society', 'FORBIDDEN', 403);
      }
    }

    const token = generateToken({
      userId: user.id,
      phone: user.phone,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      activeSocietyId: societyId,
    });

    await createAuditLog({
      societyId,
      userId: user.id,
      action: 'SWITCH_SOCIETY',
      entity: 'Society',
      entityId: societyId,
    });

    const updatedUser = await getAuthUser(user.id, societyId);

    const response = successResponse({
      token,
      user: updatedUser,
    });

    response.cookies.set('localos_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Switch society error:', error);
    return errorResponse('Failed to switch society', 'SERVER_ERROR', 500);
  }
}

