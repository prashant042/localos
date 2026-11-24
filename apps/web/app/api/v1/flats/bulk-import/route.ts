import { NextRequest } from 'next/server';
import { z } from 'zod';
import { authenticateRequest, hasPermission, hashPassword } from '@/lib/auth';
import { successResponse, errorResponse } from '@/lib/api-response';
import { prisma, createAuditLog } from '@/lib/prisma';
import { FlatType, OccupancyStatus, ResidentType, SystemRoleType } from '@prisma/client';

const rowSchema = z.object({
  blockCode: z.string().min(1),
  blockName: z.string().optional(),
  flatNumber: z.string().min(1),
  flatType: z.string().optional().default('BHK_2'),
  areaSqFt: z.coerce.number().positive(),
  parkingSlots: z.string().optional(),
  ownerName: z.string().optional(),
  ownerPhone: z.string().optional(),
  ownerEmail: z.string().email().optional(),
  occupancyStatus: z.string().optional().default('OWNER_OCCUPIED'),
});

const bulkImportSchema = z.object({
  rows: z.array(rowSchema).min(1),
});

export async function POST(req: NextRequest) {
  try {
    const { user, error } = await authenticateRequest(req);
    if (!user || error) return errorResponse(error || 'Unauthorized', 'UNAUTHORIZED', 401);
    if (!hasPermission(user, 'flat.manage')) return errorResponse('Forbidden', 'FORBIDDEN', 403);
    if (!user.societyId) return errorResponse('No active society', 'NO_SOCIETY', 400);

    const body = await req.json();
    const parsed = bulkImportSchema.safeParse(body);
    if (!parsed.success) {
      return errorResponse('Invalid import payload', 'VALIDATION_ERROR', 400, parsed.error.format());
    }

    const { rows } = parsed.data;
    const defaultPasswordHash = await hashPassword('Resident@123');
    let importedFlatsCount = 0;
    let importedResidentsCount = 0;
    const errors: Array<{ row: number; error: string }> = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      try {
        // 1. Ensure Block exists
        const blockCode = row.blockCode.toUpperCase().trim();
        const block = await prisma.block.upsert({
          where: { societyId_code: { societyId: user.societyId, code: blockCode } },
          update: {},
          create: {
            societyId: user.societyId,
            name: row.blockName || `Block ${blockCode}`,
            code: blockCode,
          },
        });

        // 2. Map FlatType
        let flatType: FlatType = FlatType.BHK_2;
        if (row.flatType && Object.values(FlatType).includes(row.flatType as FlatType)) {
          flatType = row.flatType as FlatType;
        }

        let occupancy: OccupancyStatus = OccupancyStatus.VACANT;
        if (row.occupancyStatus && Object.values(OccupancyStatus).includes(row.occupancyStatus as OccupancyStatus)) {
          occupancy = row.occupancyStatus as OccupancyStatus;
        }

        // 3. Upsert Flat
        const flat = await prisma.flat.upsert({
          where: {
            societyId_flatNumber: {
              societyId: user.societyId,
              flatNumber: row.flatNumber.trim(),
            },
          },
          update: {
            areaSqFt: row.areaSqFt,
            flatType,
            occupancyStatus: occupancy,
            parkingSlots: row.parkingSlots || null,
          },
          create: {
            societyId: user.societyId,
            blockId: block.id,
            flatNumber: row.flatNumber.trim(),
            areaSqFt: row.areaSqFt,
            flatType,
            occupancyStatus: occupancy,
            parkingSlots: row.parkingSlots || null,
          },
        });
        importedFlatsCount++;

        // 4. If Owner info provided, link Resident
        if (row.ownerPhone && row.ownerName) {
          const cleanPhone = row.ownerPhone.replace(/[^0-9]/g, '').slice(-10);
          if (cleanPhone.length === 10) {
            const residentUser = await prisma.user.upsert({
              where: { phone: cleanPhone },
              update: {
                fullName: row.ownerName,
                email: row.ownerEmail ? row.ownerEmail.toLowerCase().trim() : undefined,
              },
              create: {
                fullName: row.ownerName,
                phone: cleanPhone,
                email: row.ownerEmail ? row.ownerEmail.toLowerCase().trim() : null,
                passwordHash: defaultPasswordHash,
                isPhoneVerified: true,
              },
            });

            // Ensure society membership
            await prisma.societyMember.upsert({
              where: { societyId_userId: { societyId: user.societyId, userId: residentUser.id } },
              update: {},
              create: {
                societyId: user.societyId,
                userId: residentUser.id,
                memberType: SystemRoleType.RESIDENT,
              },
            });

            // Ensure resident profile
            const existingProfile = await prisma.residentProfile.findFirst({
              where: {
                societyId: user.societyId,
                userId: residentUser.id,
                flatId: flat.id,
              },
            });

            if (!existingProfile) {
              await prisma.residentProfile.create({
                data: {
                  societyId: user.societyId,
                  userId: residentUser.id,
                  flatId: flat.id,
                  residentType: ResidentType.OWNER,
                  isPrimaryResident: true,
                },
              });
              importedResidentsCount++;
            }
          }
        }
      } catch (rowErr: any) {
        errors.push({ row: i + 1, error: rowErr.message });
      }
    }

    await createAuditLog({
      societyId: user.societyId,
      userId: user.id,
      action: 'BULK_IMPORT_FLATS',
      entity: 'Flat',
      newValue: { importedFlatsCount, importedResidentsCount, errorsCount: errors.length },
    });

    return successResponse({
      message: `Successfully processed ${rows.length} rows`,
      importedFlatsCount,
      importedResidentsCount,
      errors,
    });
  } catch (err: any) {
    return errorResponse(err.message, 'SERVER_ERROR', 500);
  }
}
