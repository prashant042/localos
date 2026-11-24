import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, generateToken, getAuthUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';

const impersonateSchema = z.object({
  targetSocietyId: z.string().uuid(),
  reason: z.string().min(5),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) {
      return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    }

    if (!user.isSuperAdmin) {
      return errorResponse('Forbidden: Only SUPER_ADMIN can impersonate societies', 'FORBIDDEN', 403);
    }

    const body = await req.json();
    const parsed = impersonateSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Valid targetSocietyId and audit reason are required', 'VALIDATION_ERROR', 400);
    }

    const { targetSocietyId, reason } = parsed.data;

    const society = await prisma.society.findUnique({
      where: { id: targetSocietyId },
    });

    if (!society) {
      return errorResponse('Society not found', 'NOT_FOUND', 404);
    }

    // Token with impersonatedByUserId
    const token = generateToken({
      userId: user.id,
      phone: user.phone,
      email: user.email,
      isSuperAdmin: true,
      activeSocietyId: targetSocietyId,
      impersonatedByUserId: user.id,
    });

    // Immutable Audit Log
    await createAuditLog({
      societyId: targetSocietyId,
      userId: user.id,
      impersonatedByUserId: user.id,
      action: 'SUPER_ADMIN_IMPERSONATION_START',
      entity: 'Society',
      entityId: targetSocietyId,
      newValue: { reason, societyName: society.name, societyCode: society.code },
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    });

    const contextUser = await getAuthUser(user.id, targetSocietyId);

    const response = successResponse({
      token,
      user: contextUser,
      impersonating: {
        societyId: society.id,
        societyName: society.name,
        reason,
      },
    });

    response.cookies.set('localos_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 4 * 60 * 60, // 4 hours for impersonation
    });

    return response;
  } catch (error: any) {
    console.error('Impersonation error:', error);
    return errorResponse('Failed to impersonate society', 'SERVER_ERROR', 500);
  }
}

