import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma, createAuditLog } from '@/lib/prisma';
import { generateToken, getAuthUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

const otpVerifySchema = z.object({
  phone: z.string().min(10),
  otp: z.string().min(4).max(6),
  fullName: z.string().optional(), // In case new user auto-registers
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = otpVerifySchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid OTP payload', 'VALIDATION_ERROR', 400);
    }

    const { phone, otp, fullName } = parsed.data;
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    // Accept "123456" for demo / test OTP
    if (otp !== '123456') {
      return errorResponse('Invalid or expired OTP. Please try 123456 for demo.', 'INVALID_OTP', 400);
    }

    let user = await prisma.user.findUnique({
      where: { phone: cleanPhone },
      include: {
        memberships: true,
      },
    });

    if (!user) {
      // Auto-create new resident user
      user = await prisma.user.create({
        data: {
          fullName: fullName || `Resident ${cleanPhone.slice(-4)}`,
          phone: cleanPhone,
          isPhoneVerified: true,
        },
        include: {
          memberships: true,
        },
      });

      // Default attach to Greenwood Heights if demo
      const demoSociety = await prisma.society.findFirst();
      if (demoSociety) {
        await prisma.societyMember.create({
          data: {
            societyId: demoSociety.id,
            userId: user.id,
            memberType: 'RESIDENT',
          },
        });
      }
    } else {
      await prisma.user.update({
        where: { id: user.id },
        data: {
          isPhoneVerified: true,
          lastLoginAt: new Date(),
        },
      });
    }

    const defaultSocietyId = user.memberships[0]?.societyId || null;

    const token = generateToken({
      userId: user.id,
      phone: user.phone,
      email: user.email,
      isSuperAdmin: user.isSuperAdmin,
      activeSocietyId: defaultSocietyId,
    });

    await createAuditLog({
      societyId: defaultSocietyId,
      userId: user.id,
      action: 'USER_OTP_LOGIN',
      entity: 'User',
      entityId: user.id,
    });

    const authUser = await getAuthUser(user.id, defaultSocietyId);

    const response = successResponse({
      token,
      user: authUser,
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
    console.error('OTP Verify error:', error);
    return errorResponse('Failed to verify OTP', 'SERVER_ERROR', 500);
  }
}

