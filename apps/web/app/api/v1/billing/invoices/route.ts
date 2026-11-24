import { NextRequest } from 'next/server';
import { authenticateRequest } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';
import { InvoiceStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') as InvoiceStatus | null;
    const flatId = searchParams.get('flatId');
    const search = searchParams.get('search') || '';
    const page = parseInt(searchParams.get('page') || '1');
    const limit = parseInt(searchParams.get('limit') || '50');

    // Scoping: If user is RESIDENT or TENANT, scope strictly to their assigned flat(s)
    let residentFlatIds: string[] | undefined;
    if (user.role === 'RESIDENT' || user.role === 'TENANT') {
      const profiles = await prisma.residentProfile.findMany({
        where: { societyId: user.societyId, userId: user.id },
        select: { flatId: true },
      });
      residentFlatIds = profiles.map(p => p.flatId);
    }

    const where: any = {
      societyId: user.societyId,
      ...(status ? { status } : {}),
      ...(flatId ? { flatId } : {}),
      ...(residentFlatIds ? { flatId: { in: residentFlatIds } } : {}),
      ...(search ? {
        OR: [
          { invoiceNumber: { contains: search, mode: 'insensitive' } },
          { flat: { flatNumber: { contains: search, mode: 'insensitive' } } },
        ],
      } : {}),
    };

    const [total, invoices] = await Promise.all([
      prisma.maintenanceInvoice.count({ where }),
      prisma.maintenanceInvoice.findMany({
        where,
        include: {
          flat: {
            include: {
              block: true,
              residents: {
                include: {
                  user: {
                    select: { fullName: true, phone: true, email: true },
                  },
                },
              },
            },
          },
          lineItems: true,
          payments: {
            where: { status: 'SUCCESS' },
          },
        },
        orderBy: { issueDate: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);

    // Financial totals summary
    const summary = await prisma.maintenanceInvoice.aggregate({
      where: { societyId: user.societyId },
      _sum: {
        totalAmount: true,
        paidAmount: true,
        balanceAmount: true,
      },
    });

    return successResponse(invoices, {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
      summary: {
        totalBilled: summary._sum.totalAmount || 0,
        totalCollected: summary._sum.paidAmount || 0,
        totalPending: summary._sum.balanceAmount || 0,
      },
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

