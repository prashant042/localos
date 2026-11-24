# LocalOS — REST API Specification

Base URL: `/api/v1`

## 1. Authentication & Tenant Session
- `POST /auth/login` — Phone/email + password login (sets `localos_token` cookie)
- `POST /auth/register` — Register resident/society admin
- `POST /auth/otp/request` — Send 6-digit OTP (demo code `123456`)
- `POST /auth/otp/verify` — Verify phone OTP
- `POST /auth/logout` — Invalidate session
- `GET /auth/me` — Return active user, current society context, and permissions
- `POST /auth/switch-society` — Switch tenant context
- `POST /auth/impersonate` — Super Admin audited society impersonation

## 2. Societies & Flats
- `GET /societies/current` — Current society details & stats
- `PUT /societies/current` — Update society settings, GST, address
- `GET /societies/blocks` — List towers & blocks
- `POST /societies/blocks` — Create block
- `GET /flats` — List flats with search, filter, pagination
- `POST /flats` — Create flat
- `POST /flats/bulk-import` — Bulk CSV import of flats & residents

## 3. Maintenance Billing & Payments
- `GET /billing/configs` — Society billing rules
- `POST /billing/configs` — Set billing formula (sqft / fixed / GST)
- `GET /billing/invoices` — List invoices
- `POST /billing/invoices/generate-bulk` — Bulk invoice generation for billing cycle
- `POST /billing/invoices/:id/remind` — Dispatch payment reminder
- `GET /billing/reports/defaulters` — Defaulters list & balance summary
- `POST /payments/razorpay/create-order` — Create Razorpay order
- `POST /payments/razorpay/verify` — Verify signature & record payment
- `POST /payments/razorpay/webhook` — Idempotent Razorpay webhook listener
- `POST /payments/manual-record` — Record offline cheque / cash / NEFT

## 4. Complaints & Helpdesk
- `GET /complaints/categories` — Complaint categories & SLA hours
- `GET /complaints` — List complaints
- `POST /complaints` — Create ticket with photos & location
- `PUT /complaints/:id/status` — Update ticket status & resolution note
- `PUT /complaints/:id/assign` — Assign to staff/technician
- `GET, POST /complaints/:id/comments` — Comments & photo updates

## 5. Gate & Visitors
- `GET /visitors/logs` — Gate visitor activity log
- `POST /visitors/check-in` — Guard checks in visitor
- `PUT /visitors/check-out` — Guard logs visitor exit
- `POST /visitors/pre-approve` — Resident pre-approves guest with 4-digit code
- `PUT /visitors/action` — Resident approves or denies entry ping
- `POST /visitors/delivery` — Log parcel delivery

## 6. Notices & Polls
- `GET, POST /notices` — Broadcast notices with audience filtering
- `GET, POST /polls` — Community polls
- `POST /polls/:id/vote` — Cast vote (1 vote per user/flat)

## 7. Staff & Vendors
- `GET, POST /staff` — Society staff directory
- `GET, POST /staff/attendance` — Daily attendance register & punches
- `GET, POST /vendors` — Verified society vendor directory
- `GET, POST, PUT /service-requests` — Resident vendor booking requests

## 8. Super Admin
- `GET, POST /admin/societies` — SaaS societies overview & onboarding
- `GET /admin/plans` — Subscription plans
- `GET /admin/metrics` — Platform MRR, ARR, active flats & collections
- `GET /admin/audit-logs` — Global immutable audit trail

