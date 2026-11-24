import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { SubscriptionTier } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);

    const plans = await prisma.subscriptionPlan.findMany({
      include: {
        _count: {
          select: {
            subscriptions: {
              where: {
                status: 'ACTIVE',
              },
            },
          },
        },
        subscriptions: {
          where: { status: 'ACTIVE' },
          include: {
            society: {
              select: {
                id: true,
                name: true,
                city: true,
              },
            },
          },
        },
      },
      orderBy: { priceMonthly: 'asc' },
    });

    const formattedPlans = plans.map((p) => ({
      ...p,
      code: p.tier,
      activeSocietiesCount: p._count.subscriptions,
      isPopular: p.tier === SubscriptionTier.GROWTH,
      activeSocieties: p.subscriptions.map((s) => s.society),
    }));

    return successResponse(formattedPlans);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.isSuperAdmin) return errorResponse('Forbidden: Super Admin only', 'FORBIDDEN', 403);

    const body = await req.json();
    const { name, code, maxFlats, priceMonthly, priceYearly, features } = body;

    let tier: SubscriptionTier = SubscriptionTier.STARTER;
    if (code === 'GROWTH') tier = SubscriptionTier.GROWTH;
    else if (code === 'ENTERPRISE') tier = SubscriptionTier.ENTERPRISE;

    const newPlan = await prisma.subscriptionPlan.create({
      data: {
        name,
        tier,
        maxFlats: Number(maxFlats) || 100,
        priceMonthly: Number(priceMonthly) || 0,
        priceYearly: Number(priceYearly) || 0,
        features: Array.isArray(features) ? features : ['Maintenance Billing', 'Helpdesk Tickets'],
      },
    });

    return successResponse(newPlan, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}
