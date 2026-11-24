import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { InvoiceBillingCycle, CalculationMethod } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const configs = await prisma.billingConfig.findMany({
      where: { societyId: user.societyId },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(configs);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const configSchema = z.object({
  name: z.string().min(2),
  billingCycle: z.nativeEnum(InvoiceBillingCycle).default(InvoiceBillingCycle.MONTHLY),
  calculationMethod: z.nativeEnum(CalculationMethod).default(CalculationMethod.PER_SQFT_AREA),
  ratePerSqFt: z.number().optional(),
  fixedAmount: z.number().optional(),
  sinkingFundAmount: z.number().default(0),
  parkingChargePerSlot: z.number().default(0),
  dueDaysFromIssue: z.number().default(15),
  lateFeeType: z.string().default('PERCENTAGE'),
  lateFeeValue: z.number().default(5.0),
  gracePeriodDays: z.number().default(5),
  gstApplicable: z.boolean().default(false),
  gstPercentage: z.number().default(18.0),
  autoBillingEnabled: z.boolean().default(true),
  autoBillingDay: z.number().default(1),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'billing.create')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = configSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid billing config', 'VALIDATION_ERROR', 400, parsed.error.format());

    // Deactivate previous configs if active
    await prisma.billingConfig.updateMany({
      where: { societyId: user.societyId },
      data: { isActive: false },
    });

    const newConfig = await prisma.billingConfig.create({
      data: {
        societyId: user.societyId,
        ...parsed.data,
        isActive: true,
      },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'BILLING_CONFIG_CREATED',
      entity: 'BillingConfig',
      entityId: newConfig.id,
      newValue: newConfig,
    });

    return successResponse(newConfig, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

