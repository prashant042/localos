# LocalOS — Society Operating System

> Production-ready, modular, multi-tenant SaaS web application engineered for Indian housing societies, apartments, RWAs, gated communities, and residential complexes.

---

## 🌟 Overview
LocalOS bridges the divide between non-technical RWA committee members (presidents, secretaries, treasurers) who require intuitive, low-friction interfaces and the rigorous governance, financial accountability, and security demands of modern residential complexes.

---

## 🚀 Key Features

### 1. Resident Portal (`/dashboard`, `/dues`, `/complaints`, `/visitors`, `/notices`, `/polls`, `/services`)
- **1-Click Maintenance Payments**: Razorpay UPI integration, instant digital receipts, and itemized billing ledger.
- **Helpdesk & Complaints**: Raise tickets with categories, priority flags, photo uploads, SLA timers, and direct technician communication.
- **Gate Pass Pre-Approval**: Generate 4-digit guest entry OTP passes and approve/deny gate visitors in real-time.
- **Community Notices & Polls**: View official RWA announcements and cast votes in democratic 1-vote-per-flat polls.
- **Verified Local Services**: Book society-vetted electricians, plumbers, and technicians with clear pricing.

### 2. Society Admin Console (`/society-admin`)
- **Executive Dashboard**: Real-time KPIs covering total flats, active residents, monthly billing, collection rate, pending dues, and open tickets.
- **Flats & Resident Hierarchy**: Manage blocks, towers, and flats with instant **Bulk CSV Import** and sample generation.
- **Modular Billing Engine**: Configure sq.ft rates or fixed charges, sinking funds, parking slots, and late fee penalties. Generate monthly/quarterly invoices in bulk.
- **Defaulters Report**: List overdue balances and send multi-channel payment reminders in 1 click.
- **Helpdesk Management**: Assign maintenance tickets to staff or vendors, update progress, and log resolution notes.
- **Gate Activity & Deliveries**: Track visitor logs and delivery parcels from Amazon, Swiggy, Zomato, and Blinkit.
- **Staff Attendance Register**: Daily check-in/check-out punches for security guards, cleaners, and facility managers.
- **Society Settings & GST**: Configure legal society profile, GSTIN, and toggleable module settings.
- **Audit Trail**: Immutable audit logging for all mutations.

### 3. Security Guard Gate Console (`/guard`)
- **Touch-Friendly Tablet Mode**: High-contrast, large touch targets designed for gate tablet kiosks.
- **Quick Check-In**: Fast visitor entry for Guests, Deliveries, Cabs, and Staff.
- **OTP Pass Verification**: Instantly verify 4-digit resident pre-approved guest codes.
- **1-Click Check-Out**: Mark visitor departures.

### 4. Super Admin SaaS Platform (`/admin`)
- **Platform Analytics**: Total onboarded societies, active flats, Monthly Recurring Revenue (MRR), ARR, and transaction volume.
- **Society Lifecycle**: Onboard new societies, assign plans (Starter, Growth, Enterprise).
- **Auditable Impersonation**: Explicit impersonation into any society with mandatory reason logging and immutable audit logs.

---

## 🔑 Demo Personas & Credentials

| Role | Name | Mobile / Login | Password | Purpose |
| :--- | :--- | :--- | :--- | :--- |
| **Super Admin** | Platform Owner | `9999900000` | `Admin@123` | Master SaaS console, MRR, onboarding |
| **Society Admin** | Rajesh Sharma (President) | `9876543210` | `Admin@123` | RWA Admin console, billing, complaints |
| **Committee Member** | Sunita Rao (Secretary) | `9876543211` | `Admin@123` | Committee approvals & notices |
| **Resident (Owner)** | Amit Patel (Flat A-402) | `9876543212` | `Resident@123` | Maintenance dues, complaints, gate pass |
| **Resident (Tenant)** | Priya Verma (Flat B-201) | `9876543213` | `Resident@123` | Tenant dues, polls, visitor approvals |
| **Security Guard** | Ramesh Bahadur (Gate 1) | `9876543214` | `Guard@123` | Gate console, visitor check-in, deliveries |
| **Vendor** | Vikram Singh (Apex Plumbing) | `9876543215` | `Vendor@123` | Assigned jobs & service requests |

> **Phone OTP Login**: Enter any registered 10-digit phone number and use verification code **`123456`**.

---

## 🛠️ Monorepo Structure

```
/localos
├── apps
│   └── web                             # Next.js 14 App Router Full-Stack Application
│       ├── app
│       │   ├── (auth) / login          # Password & Phone OTP Authentication
│       │   ├── (resident)              # Resident Portal (/dashboard, /dues, /complaints, etc.)
│       │   ├── (admin)                 # Society Admin Console (/society-admin/*)
│       │   ├── (guard)                 # Security Guard Console (/guard/*)
│       │   ├── (superadmin)            # Super Admin Platform (/admin/*)
│       │   └── api/v1                  # REST API Route Handlers (28 endpoints)
│       ├── components                  # Modular UI design system & Layout shells
│       └── lib                         # Database singleton, JWT auth & permissions
├── packages
│   ├── types                           # Shared TypeScript Types & DTOs
│   ├── utils                           # INR format, date format, phone & invoice math
│   ├── config                          # Registered modules & RBAC permission matrix
│   └── ui                              # Design system tokens & utility classes
├── services
│   └── notifications                   # Pluggable Notification Hub (Email, SMS, WhatsApp)
├── prisma
│   ├── schema.prisma                   # Normalized PostgreSQL Multi-Tenant Schema (40+ models)
│   └── seed.ts                         # Complete Seed (Greenwood Heights RWA)
├── tests
│   └── core-logic.test.ts              # Unit tests for billing calculations & RBAC
└── docs
    ├── prd.md                          # Product Requirements Document
    ├── architecture.md                 # System Architecture & Multi-Tenancy
    ├── api.md                          # REST API Endpoint Documentation
    ├── database.md                     # Schema & Indexing Guide
    └── deployment.md                   # Production Deployment & Docker Guide
```

---

## 💻 Quickstart Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Database Setup (PostgreSQL)
Ensure your `DATABASE_URL` is configured in `.env`.
```bash
npx prisma db push
npm run db:seed
```

### 3. Run Unit Tests
```bash
node --experimental-strip-types tests/core-logic.test.ts
```

### 4. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

