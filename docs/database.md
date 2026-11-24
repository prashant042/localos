# LocalOS — Database Schema & Data Models

## 1. Engine & Conventions
- **Database**: PostgreSQL 18
- **ORM**: Prisma Client v5.22
- **Keys**: UUID primary keys (`@default(uuid())`)
- **Indexes**: Compound multi-column indexes on `[societyId, status]`, `[societyId, flatId]`, `[societyId, createdAt]`.
- **Soft Deletes**: Where required by compliance (residents, staff).

## 2. Key Entities
- **User**: Authentication, contact info, super admin flag.
- **Society**: Tenant root record with registration number, GSTIN, code, address.
- **SocietyMember**: Connects users to societies with a `SystemRoleType`.
- **Block & Flat**: Spatial hierarchy representing towers, wings, floors, and flats.
- **ResidentProfile**: Flat resident records (Owner vs. Tenant), move-in date.
- **BillingConfig**: Configurable maintenance formula (rate per sqft, fixed amount, parking rate, late fee %, GST %).
- **MaintenanceInvoice & LineItem**: Issued maintenance demands, itemized breakdown.
- **Payment & PaymentWebhookEvent**: Online and offline transactions with idempotency tracking.
- **Complaint & ComplaintCategory**: Issue tickets, SLA targets, staff assignments.
- **Visitor & VisitorLog**: Security gate logs, pre-approvals, 4-digit check-in OTP.
- **Staff & StaffAttendance**: Society workers and daily punch register.
- **Vendor & ServiceRequest**: Directory of local service providers and job requests.
- **AuditLog**: Immutable trace of all system mutations and impersonations.

