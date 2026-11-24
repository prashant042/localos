import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';
import { prisma } from './prisma';
import { SYSTEM_ROLE_PERMISSIONS } from '@localos/config';
import { AuthUser, SystemRole } from '@localos/types';

const JWT_SECRET = process.env.JWT_SECRET || 'localos_default_secret_key_change_in_production';
const ACCESS_TOKEN_EXPIRY = '7d';

export interface TokenPayload {
  userId: string;
  phone: string;
  email: string | null;
  isSuperAdmin: boolean;
  activeSocietyId?: string | null;
  impersonatedByUserId?: string | null;
}

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(payload: TokenPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: ACCESS_TOKEN_EXPIRY });
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as TokenPayload;
  } catch (err) {
    return null;
  }
}

/**
 * Resolves full AuthUser with permissions and society context
 */
export async function getAuthUser(userId: string, requestedSocietyId?: string | null): Promise<AuthUser | null> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      memberships: {
        include: {
          society: true,
        },
      },
      userRoles: {
        include: {
          role: {
            include: {
              permissions: {
                include: {
                  permission: true,
                },
              },
            },
          },
        },
      },
    },
  });

  if (!user) return null;

  // Determine active society
  let activeSocietyId = requestedSocietyId;
  let activeMembership = user.memberships.find(m => m.societyId === activeSocietyId);

  if (!activeMembership && user.memberships.length > 0) {
    activeMembership = user.memberships[0];
    activeSocietyId = activeMembership.societyId;
  }

  // Determine role
  let role: SystemRole = 'RESIDENT';
  if (user.isSuperAdmin) {
    role = 'SUPER_ADMIN';
  } else if (activeMembership) {
    role = activeMembership.memberType as SystemRole;
  }

  // Gather permissions
  const permissionsSet = new Set<string>();

  // Default permissions from role map
  const defaultPerms = SYSTEM_ROLE_PERMISSIONS[role] || [];
  defaultPerms.forEach(p => permissionsSet.add(p));

  // Additional custom permissions from database RolePermission
  for (const ur of user.userRoles) {
    if (!ur.societyId || ur.societyId === activeSocietyId) {
      for (const rp of ur.role.permissions) {
        permissionsSet.add(rp.permission.code);
      }
    }
  }

  return {
    id: user.id,
    email: user.email,
    phone: user.phone,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    isSuperAdmin: user.isSuperAdmin,
    societyId: activeSocietyId || null,
    societyName: activeMembership?.society?.name || null,
    societyCode: activeMembership?.society?.code || null,
    role,
    permissions: Array.from(permissionsSet),
  };
}

/**
 * Middleware helper for API route handlers
 */
export async function authenticateRequest(req: NextRequest): Promise<{
  user: AuthUser | null;
  impersonatedByUserId?: string | null;
  error?: string;
}> {
  let token: string | undefined;

  // 1. Try Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Try cookie
  if (!token) {
    const cookieStore = cookies();
    token = cookieStore.get('localos_token')?.value;
  }

  if (!token) {
    return { user: null, error: 'Unauthorized: No token provided' };
  }

  const payload = verifyToken(token);
  if (!payload) {
    return { user: null, error: 'Unauthorized: Invalid or expired token' };
  }

  // Allow client to request specific society via header or token
  const headerSocietyId = req.headers.get('x-society-id') || payload.activeSocietyId;
  const user = await getAuthUser(payload.userId, headerSocietyId);

  if (!user) {
    return { user: null, error: 'Unauthorized: User not found' };
  }

  return {
    user,
    impersonatedByUserId: payload.impersonatedByUserId,
  };
}

/**
 * Check if user has permission
 */
export function hasPermission(user: AuthUser, permissionCode: string): boolean {
  if (user.isSuperAdmin) return true;
  return user.permissions.includes(permissionCode);
}

