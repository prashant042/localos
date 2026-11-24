import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma, createAuditLog } from '@/lib/prisma';
import { generateToken, verifyPassword, getAuthUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

const loginSchema = z.object({
  identifier: z.string().min(3), // phone or email
  password: z.string().min(4),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid login credentials format', 'VALIDATION_ERROR', 400, parsed.error.format());
    }

    const { identifier, password } = parsed.data;

    // Search user by email or phone
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          { email: identifier.toLowerCase().trim() },
          { phone: identifier.replace(/[^0-9]/g, '') },
        ],
      },
      include: {
        memberships: true,
      },
    });

    if (!user || !user.passwordHash) {
      return errorResponse('Invalid email/phone or password', 'INVALID_CREDENTIALS', 401);
    }

    const isMatch = await verifyPassword(password, user.passwordHash);
    if (!isMatch) {
      return errorResponse('Invalid email/phone or password', 'INVALID_CREDENTIALS', 401);
    }

    // Determine initial active society
    const defaultSocietyId = user.memberships[0]?.societyId || null;

    // Generate JWT Token
    const token = generateToken({
      userId: user.id,
      phone: user.phone,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      activeSocietyId: defaultSocietyId,
    });

    // Update last login
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await createAuditLog({
      societyId: defaultSocietyId,
      userId: user.id,
      action: 'USER_LOGIN',
      entity: 'User',
      entityId: user.id,
      ipAddress: req.headers.get('x-forwarded-for') || '127.0.0.1',
      userAgent: req.headers.get('user-agent'),
    });

    const authUser = await getAuthUser(user.id, defaultSocietyId);

    const response = successResponse({
      token,
      user: authUser,
    });

    // Set HttpOnly cookie for web browser session
    response.cookies.set('localos_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60, // 7 days
    });

    return response;
  } catch (error: any) {
    console.error('Login error:', error);
    return errorResponse(error.message || 'Internal server error', 'SERVER_ERROR', 500);
  }
}

