import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.isSuperAdmin) return errorResponse('Forbidden: Super Admin access required', 'FORBIDDEN', 403);

    const [
      totalSocieties,
      activeSocieties,
      totalFlats,
      totalResidents,
      activeSubscriptions,
      paymentStats,
      totalComplaints,
      totalVisitors,
    ] = await Promise.all([
      prisma.society.count(),
      prisma.society.count({ where: { status: 'ACTIVE' } }),
      prisma.flat.count(),
      prisma.residentProfile.count(),
      prisma.societySubscription.findMany({
        where: { status: 'ACTIVE' },
        include: { plan: true },
      }),
      prisma.payment.aggregate({
        where: { status: 'SUCCESS' },
        _sum: { amount: true },
        _count: true,
      }),
      prisma.complaint.count(),
      prisma.visitorLog.count(),
    ]);

    const mrr = activeSubscriptions.reduce((acc, sub) => acc + (sub.plan?.priceMonthly || 0), 0);
    const arr = mrr * 12;

    return successResponse({
      societies: {
        total: totalSocieties,
        active: activeSocieties,
      },
      flats: {
        total: totalFlats,
      },
      residents: {
        total: totalResidents,
      },
      financials: {
        mrr,
        arr,
        totalCollectionsProcessed: paymentStats._sum.amount || 0,
        totalTransactionsCount: paymentStats._count,
      },
      activity: {
        totalComplaints,
        totalVisitors,
      },
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

