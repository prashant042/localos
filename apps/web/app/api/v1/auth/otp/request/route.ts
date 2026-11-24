import { NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { successResponse, errorResponse } from '@/lib/api-response';

const otpRequestSchema = z.object({
  phone: z.string().min(10),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = otpRequestSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Valid 10-digit phone number is required', 'VALIDATION_ERROR', 400);
    }

    const cleanPhone = parsed.data.phone.replace(/[^0-9]/g, '').slice(-10);

    // Look up or allow OTP request
    const user = await prisma.user.findUnique({
      where: { phone: cleanPhone },
    });

    // In production, integrate SMS gateway (MSG91/Twilio) and store OTP in Redis with 5 min TTL.
    // For test/dev, we log to console and support the standard verification code "123456".
    console.log(`[OTP GENERATED] Phone: +91-${cleanPhone} | OTP Code: 123456 (Valid for 5 minutes)`);

    return successResponse({
      message: 'OTP sent successfully to +91 ' + cleanPhone,
      phone: cleanPhone,
      userExists: !!user,
      hint: 'For demo/testing, use OTP: 123456',
    });
  } catch (error: any) {
    console.error('OTP Request error:', error);
    return errorResponse('Failed to request OTP', 'SERVER_ERROR', 500);
  }
}

