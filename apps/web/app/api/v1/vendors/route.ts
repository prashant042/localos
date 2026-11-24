import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const search = searchParams.get('search') || '';

    const vendors = await prisma.vendor.findMany({
      where: {
        societyId: user.societyId,
        isActive: true,
        ...(category ? { category } : {}),
        ...(search ? {
          OR: [
            { companyName: { contains: search, mode: 'insensitive' } },
            { contactPerson: { contains: search, mode: 'insensitive' } },
            { category: { contains: search, mode: 'insensitive' } },
          ],
        } : {}),
      },
      include: {
        services: true,
        _count: { select: { serviceRequests: true } },
      },
      orderBy: [{ rating: 'desc' }, { companyName: 'asc' }],
    });

    return successResponse(vendors);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

const addVendorSchema = z.object({
  companyName: z.string().min(2),
  contactPerson: z.string().min(2),
  phone: z.string().min(10),
  email: z.string().email().optional(),
  category: z.string().min(2),
  gstNumber: z.string().optional(),
  address: z.string().optional(),
  services: z.array(z.object({
    serviceName: z.string().min(2),
    basePrice: z.number().positive().optional(),
    description: z.string().optional(),
  })).default([]),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'vendor.manage')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = addVendorSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid vendor data', 'VALIDATION_ERROR', 400);

    const { companyName, contactPerson, phone, email, category, gstNumber, address, services } = parsed.data;
    const cleanPhone = phone.replace(/[^0-9]/g, '').slice(-10);

    const vendor = await prisma.vendor.create({
      data: {
        societyId: user.societyId,
        companyName,
        contactPerson,
        phone: cleanPhone,
        email: email ? email.toLowerCase().trim() : null,
        category,
        gstNumber: gstNumber || null,
        address: address || null,
        services: {
          create: services.map(s => ({
            serviceName: s.serviceName,
            basePrice: s.basePrice || null,
            description: s.description || null,
          })),
        },
      },
      include: { services: true },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'VENDOR_CREATED',
      entity: 'Vendor',
      entityId: vendor.id,
      newValue: vendor,
    });

    return successResponse(vendor, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

