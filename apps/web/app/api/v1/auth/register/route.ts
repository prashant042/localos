import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma, createAuditLog } from '@/lib/prisma';
import { generateToken, hashPassword, getAuthUser } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';

const registerSchema = z.object({
  fullName: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  password: z.string().min(6),
  societyCode: z.string().optional(), // If joining existing society
  flatNumber: z.string().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid registration data', 'VALIDATION_ERROR', 400, parsed.error.format());
    }

    const { fullName, phone, email, password, societyCode, flatNumber } = parsed.data;
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    // Check existing phone
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          { phone: cleanPhone },
          ...(email ? [{ email: email.toLowerCase().trim() }] : []),
        ],
      },
    });

    if (existingUser) {
      return errorResponse('A user with this phone or email already exists', 'ALREADY_EXISTS', 400);
    }

    const passwordHash = await hashPassword(password);

    // Create user
    const user = await prisma.user.create({
      data: {
        fullName,
        phone: cleanPhone,
        email: email ? email.toLowerCase().trim() : null,
        passwordHash,
        isPhoneVerified: true, // Auto-verified for mock/demo
      },
    });

    let activeSocietyId: string | null = null;

    // If societyCode provided, attach user to society
    if (societyCode) {
      const society = await prisma.society.findUnique({
        where: { code: societyCode.toUpperCase().trim() },
      });

      if (society) {
        activeSocietyId = society.id;
        await prisma.societyMember.create({
          data: {
            societyId: society.id,
            userId: user.id,
            memberType: 'RESIDENT',
          },
        });

        // Link flat if exists
        if (flatNumber) {
          const flat = await prisma.flat.findFirst({
            where: { societyId: society.id, flatNumber },
          });
          if (flat) {
            await prisma.residentProfile.create({
              data: {
                societyId: society.id,
                userId: user.id,
                flatId: flat.id,
                residentType: 'OWNER',
                isPrimaryResident: true,
              },
            });
          }
        }
      }
    }

    const token = generateToken({
      userId: user.id,
      phone: user.phone,
      email: user.email,
      isSuperAdmin: false,
      activeSocietyId,
    });

    await createAuditLog({
      societyId: activeSocietyId,
      userId: user.id,
      action: 'USER_REGISTERED',
      entity: 'User',
      entityId: user.id,
    });

    const authUser = await getAuthUser(user.id, activeSocietyId);

    const response = successResponse({
      token,
      user: authUser,
    }, undefined, 201);

    response.cookies.set('localos_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Registration error:', error);
    return errorResponse(error.message || 'Internal server error', 'SERVER_ERROR', 500);
  }
}

