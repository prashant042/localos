import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { ExpenseCategory, ExpenseStatus, PaymentMethod } from '@prisma/client';

const createExpenseSchema = z.object({
  title: z.string().min(2),
  vendorId: z.string().uuid().optional(),
  category: z.nativeEnum(ExpenseCategory).default(ExpenseCategory.OTHER),
  amount: z.number().positive(),
  status: z.nativeEnum(ExpenseStatus).default(ExpenseStatus.PENDING),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  invoiceNumber: z.string().optional(),
  billDate: z.string().optional(),
  dueDate: z.string().optional(),
  paidAt: z.string().optional(),
  receiptUrl: z.string().optional(),
  notes: z.string().optional(),
});

const updateExpenseSchema = z.object({
  expenseId: z.string().uuid(),
  status: z.nativeEnum(ExpenseStatus).optional(),
  paymentMethod: z.nativeEnum(PaymentMethod).optional(),
  paidAt: z.string().optional(),
  notes: z.string().optional(),
});

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') as ExpenseCategory | null;
    const status = searchParams.get('status') as ExpenseStatus | null;
    const search = searchParams.get('search') || '';

    const societyId = user.societyId;

    const where: any = {
      societyId,
      ...(category ? { category } : {}),
      ...(status ? { status } : {}),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { invoiceNumber: { contains: search, mode: 'insensitive' } },
              { vendor: { companyName: { contains: search, mode: 'insensitive' } } },
            ],
          }
        : {}),
    };

    const [expenses, expenseSummary, paymentSummary] = await Promise.all([
      prisma.expense.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              companyName: true,
              contactPerson: true,
              phone: true,
              category: true,
            },
          },
        },
        orderBy: { billDate: 'desc' },
      }),
      prisma.expense.aggregate({
        where: { societyId },
        _sum: { amount: true },
      }),
      prisma.payment.aggregate({
        where: { societyId, status: 'SUCCESS' },
        _sum: { amount: true },
      }),
    ]);

    const paidExpenses = expenses.filter((e) => e.status === ExpenseStatus.PAID);
    const pendingExpenses = expenses.filter(
      (e) => e.status === ExpenseStatus.PENDING || e.status === ExpenseStatus.OVERDUE
    );

    const totalPaid = paidExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalPending = pendingExpenses.reduce((sum, e) => sum + e.amount, 0);
    const totalCollections = paymentSummary._sum.amount || 0;
    const netSocietyReserve = totalCollections - totalPaid;

    return successResponse({
      expenses,
      summary: {
        totalExpensesBilled: expenseSummary._sum.amount || 0,
        totalPaid,
        totalPending,
        totalCollections,
        netSocietyReserve,
      },
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'billing.create')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = createExpenseSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid expense payload', 'VALIDATION_ERROR', 400, parsed.error.format());

    const {
      title,
      vendorId,
      category,
      amount,
      status,
      paymentMethod,
      invoiceNumber,
      billDate,
      dueDate,
      paidAt,
      receiptUrl,
      notes,
    } = parsed.data;

    const societyId = user.societyId;

    const expense = await prisma.expense.create({
      data: {
        societyId,
        vendorId: vendorId || null,
        title,
        category,
        amount,
        status,
        paymentMethod: paymentMethod || null,
        invoiceNumber: invoiceNumber || null,
        billDate: billDate ? new Date(billDate) : new Date(),
        dueDate: dueDate ? new Date(dueDate) : null,
        paidAt: paidAt ? new Date(paidAt) : status === 'PAID' ? new Date() : null,
        receiptUrl: receiptUrl || null,
        notes: notes || null,
      },
      include: {
        vendor: true,
      },
    });

    await createAuditLog({
      societyId,
      userId: user.id,
      action: 'EXPENSE_RECORDED',
      entity: 'Expense',
      entityId: expense.id,
      newValue: { title, amount, category, status },
    });

    return successResponse(expense, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'billing.create')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = updateExpenseSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid update payload', 'VALIDATION_ERROR', 400);

    const { expenseId, status, paymentMethod, paidAt, notes } = parsed.data;
    const societyId = user.societyId;

    const expense = await prisma.expense.findFirst({
      where: { id: expenseId, societyId },
    });

    if (!expense) return errorResponse('Expense record not found', 'NOT_FOUND', 404);

    const updated = await prisma.expense.update({
      where: { id: expense.id },
      data: {
        ...(status ? { status } : {}),
        ...(paymentMethod ? { paymentMethod } : {}),
        ...(paidAt ? { paidAt: new Date(paidAt) } : status === 'PAID' && !expense.paidAt ? { paidAt: new Date() } : {}),
        ...(notes ? { notes } : {}),
      },
      include: {
        vendor: true,
      },
    });

    await createAuditLog({
      societyId,
      userId: user.id,
      action: 'EXPENSE_UPDATED',
      entity: 'Expense',
      entityId: expense.id,
      newValue: { previousStatus: expense.status, newStatus: status || expense.status },
    });

    return successResponse(updated);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'billing.create')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('Expense ID required', 'VALIDATION_ERROR', 400);

    const societyId = user.societyId;

    const expense = await prisma.expense.findFirst({
      where: { id, societyId },
    });

    if (!expense) return errorResponse('Expense not found', 'NOT_FOUND', 404);

    await prisma.expense.delete({ where: { id: expense.id } });

    await createAuditLog({
      societyId,
      userId: user.id,
      action: 'EXPENSE_DELETED',
      entity: 'Expense',
      entityId: id,
      newValue: { title: expense.title, amount: expense.amount },
    });

    return successResponse({ message: 'Expense deleted successfully' });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}
