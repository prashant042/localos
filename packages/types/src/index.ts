// Exported Shared Types for LocalOS

export type SystemRole =
  | 'SUPER_ADMIN'
  | 'SOCIETY_ADMIN'
  | 'COMMITTEE_MEMBER'
  | 'RESIDENT'
  | 'TENANT'
  | 'GUARD'
  | 'VENDOR'
  | 'ACCOUNTANT';

export type SocietyStatus = 'TRIAL' | 'ACTIVE' | 'SUSPENDED' | 'DEACTIVATED';

export type FlatType =
  | 'STUDIO'
  | 'BHK_1'
  | 'BHK_2'
  | 'BHK_3'
  | 'BHK_4'
  | 'BHK_5'
  | 'PENTHOUSE'
  | 'VILLA'
  | 'COMMERCIAL_SHOP';

export type OccupancyStatus = 'VACANT' | 'OWNER_OCCUPIED' | 'TENANT_OCCUPIED';

export type ResidentType = 'OWNER' | 'TENANT' | 'FAMILY_MEMBER';

export type InvoiceStatus =
  | 'DRAFT'
  | 'ISSUED'
  | 'PARTIALLY_PAID'
  | 'PAID'
  | 'OVERDUE'
  | 'CANCELLED';

export type PaymentMethod =
  | 'UPI'
  | 'CARD'
  | 'NETBANKING'
  | 'CASH'
  | 'CHEQUE'
  | 'BANK_TRANSFER'
  | 'NEFT_RTGS';

export type PaymentStatus = 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';

export type ComplaintPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export type ComplaintStatus =
  | 'OPEN'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'ON_HOLD'
  | 'RESOLVED'
  | 'REOPENED'
  | 'CLOSED';

export type VisitorType =
  | 'GUEST'
  | 'DELIVERY'
  | 'STAFF'
  | 'VENDOR'
  | 'CAB'
  | 'SERVICE'
  | 'OTHER';

export type VisitorStatus =
  | 'WAITING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'CHECKED_IN'
  | 'CHECKED_OUT';

export type StaffRole =
  | 'SECURITY_GUARD'
  | 'HEAD_GUARD'
  | 'CLEANER'
  | 'GARDENER'
  | 'ELECTRICIAN'
  | 'PLUMBER'
  | 'ESTATE_MANAGER'
  | 'ACCOUNTANT';

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'HALF_DAY' | 'LEAVE';

export interface AuthUser {
  id: string;
  email: string | null;
  phone: string;
  fullName: string;
  avatarUrl?: string | null;
  isSuperAdmin: boolean;
  societyId?: string | null;
  societyName?: string | null;
  societyCode?: string | null;
  role: SystemRole;
  permissions: string[];
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: any;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    totalPages?: number;
  };
}

export interface ModuleManifest {
  key: string;
  name: string;
  description: string;
  requiredPlan: 'STARTER' | 'GROWTH' | 'ENTERPRISE';
  defaultEnabled: boolean;
  permissions: string[];
}

