import { NextRequest } from 'next/server';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'reports.view')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    // Fetch invoices with balance > 0
    const pendingInvoices = await prisma.maintenanceInvoice.findMany({
      where: {
        societyId: user.societyId,
        balanceAmount: { gt: 0 },
      },
      include: {
        flat: {
          include: {
            block: true,
            residents: {
              include: { user: { select: { fullName: true, phone: true, email: true } } },
            },
          },
        },
      },
      orderBy: { dueDate: 'asc' },
    });

    // Group by Flat
    const defaultersMap = new Map<string, any>();

    for (const inv of pendingInvoices) {
      const flatKey = inv.flatId;
      const isOverdue = new Date(inv.dueDate) < new Date();

      if (!defaultersMap.has(flatKey)) {
        defaultersMap.set(flatKey, {
          flatId: inv.flatId,
          flatNumber: inv.flat.flatNumber,
          block: inv.flat.block.name,
          primaryResident: inv.flat.residents[0]?.user || null,
          totalPending: 0,
          totalOverdue: 0,
          pendingInvoicesCount: 0,
          oldestDueDate: inv.dueDate,
          invoices: [],
        });
      }

      const item = defaultersMap.get(flatKey);
      item.totalPending += inv.balanceAmount;
      if (isOverdue) {
        item.totalOverdue += inv.balanceAmount;
      }
      item.pendingInvoicesCount += 1;
      item.invoices.push({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        dueDate: inv.dueDate,
        balanceAmount: inv.balanceAmount,
        isOverdue,
      });
    }

    const defaulters = Array.from(defaultersMap.values()).sort((a, b) => b.totalPending - a.totalPending);

    const totalOverdueAmount = defaulters.reduce((acc, d) => acc + d.totalOverdue, 0);
    const totalPendingAmount = defaulters.reduce((acc, d) => acc + d.totalPending, 0);

    return successResponse({
      defaulters,
      summary: {
        defaulterFlatsCount: defaulters.length,
        totalOverdueAmount,
        totalPendingAmount,
      },
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

