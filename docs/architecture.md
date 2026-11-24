# LocalOS — System Architecture & Multi-Tenancy

## 1. High-Level Architecture
LocalOS implements a layered clean architecture:
- **Presentation Layer**: Next.js 14 App Router, TypeScript strict mode, Tailwind CSS, Lucide icons, accessible responsive components.
- **API Gateway Layer**: Edge route handlers (`/api/v1/*`) with Zod request validation, rate-limiting, and error formatting.
- **Security & Multi-Tenant Context**: JWT session resolution via HttpOnly cookies, tenant isolation via scoped `societyId`, RBAC permissions matrix.
- **Service Layer**: Pure domain logic for billing calculations, payment reconciliation, SLA tracking, and audit logging.
- **Data Access Layer**: Prisma ORM with PostgreSQL 18 connection, compound indexes, UUID primary keys, and strict foreign keys.
- **Notification Hub**: Pluggable channel abstraction (In-App, Email, SMS, WhatsApp-ready).

## 2. Multi-Tenancy Guarantee
Every operational record belongs to a specific `societyId`.
- **Query Scoping**: Enforced across all API handlers. Queries strictly include `where: { societyId }`.
- **Tenant Switching**: Supported for committee members belonging to multiple societies.
- **Super Admin Impersonation**: Explicit impersonation endpoint (`/api/v1/auth/impersonate`) requiring a mandatory audit reason string and creating immutable `AuditLog` records.

