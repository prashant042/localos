import { NextRequest } from 'next/server';
import { successResponse } from '@/lib/api-response';

export async function POST(req: NextRequest) {
  const response = successResponse({ message: 'Logged out successfully' });

  // Invalidate cookie
  response.cookies.set('localos_token', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });

  return response;
}

