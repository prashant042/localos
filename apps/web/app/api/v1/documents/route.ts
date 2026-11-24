import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { DocumentCategory, DocumentVisibility } from '@prisma/client';

const createDocumentSchema = z.object({
  title: z.string().min(2),
  category: z.nativeEnum(DocumentCategory).default(DocumentCategory.CIRCULAR),
  fileUrl: z.string().min(2),
  fileType: z.string().default('application/pdf'),
  fileSize: z.number().int().positive().default(1024 * 500),
  visibility: z.nativeEnum(DocumentVisibility).default(DocumentVisibility.RESIDENTS_ONLY),
});

export async function GET(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category') as DocumentCategory | null;
    const search = searchParams.get('search') || '';

    const isResident = user.role === 'RESIDENT' || user.role === 'TENANT';

    const where: any = {
      societyId: user.societyId,
      ...(category ? { category } : {}),
      ...(isResident
        ? { visibility: { in: [DocumentVisibility.PUBLIC, DocumentVisibility.RESIDENTS_ONLY] } }
        : {}),
      ...(search ? { title: { contains: search, mode: 'insensitive' } } : {}),
    };

    const documents = await prisma.document.findMany({
      where,
      include: {
        uploadedBy: {
          select: {
            fullName: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(documents);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'society.update') && user.role !== 'SOCIETY_ADMIN' && user.role !== 'COMMITTEE_MEMBER') {
      return errorResponse('Forbidden: Admin permission required', 'FORBIDDEN', 403);
    }
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = createDocumentSchema.safeParse(body);
    if (!parsed.success) return errorResponse('Invalid document payload', 'VALIDATION_ERROR', 400, parsed.error.format());

    const { title, category, fileUrl, fileType, fileSize, visibility } = parsed.data;

    const doc = await prisma.document.create({
      data: {
        societyId: user.societyId,
        title,
        category,
        fileUrl,
        fileType,
        fileSize,
        visibility,
        uploadedById: user.id,
      },
      include: {
        uploadedBy: {
          select: { fullName: true },
        },
      },
    });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'DOCUMENT_UPLOADED',
      entity: 'Document',
      entityId: doc.id,
      newValue: { title, category, visibility },
    });

    return successResponse(doc, undefined, 201);
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (user.role !== 'SOCIETY_ADMIN' && user.role !== 'SUPER_ADMIN') {
      return errorResponse('Forbidden: Only Society Admin can delete documents', 'FORBIDDEN', 403);
    }
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) return errorResponse('Document ID required', 'VALIDATION_ERROR', 400);

    const doc = await prisma.document.findFirst({
      where: { id, societyId: user.societyId },
    });

    if (!doc) return errorResponse('Document not found', 'NOT_FOUND', 404);

    await prisma.document.delete({ where: { id: doc.id } });

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'DOCUMENT_DELETED',
      entity: 'Document',
      entityId: id,
      newValue: { title: doc.title },
    });

    return successResponse({ message: 'Document deleted successfully' });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}
