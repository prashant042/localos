# LocalOS — Product Requirements Document (PRD)

## 1. Product Vision & Overview
**LocalOS** is a specialized, multi-tenant society operating system engineered for Indian residential complexes, Apartments, Resident Welfare Associations (RWAs), and Gated Communities.

### Core Problems Solved
1. **Delayed & Disorganized Maintenance Collections**: Moving from awkward manual follow-ups, cash receipts, and cheques to automated invoice cycles and instant 1-click UPI payments via Razorpay.
2. **Chaotic Complaint Management**: Transitioning informal WhatsApp groups and verbal complaints into a structured helpdesk with categories, SLA deadlines, and vendor assignments.
3. **Gate Security & Delivery Congestion**: Replacing physical paper registers with a touch-friendly tablet guard console featuring resident pre-approvals, OTP verification, and delivery logging.
4. **Community Democracy**: Digital broadcast notice boards and democratic 1-vote-per-flat polling.

---

## 2. Multi-Tenant Architecture & Roles

### System Roles
- **SUPER_ADMIN**: Platform SaaS owner. Manages society onboarding, subscriptions (Starter, Growth, Enterprise), global health metrics, and explicit impersonation.
- **SOCIETY_ADMIN**: RWA President / Secretary / Treasurer. Manages residents, flats, bulk invoice generation, complaints, gate logs, staff, and vendors.
- **COMMITTEE_MEMBER**: Executive members with review and approval permissions.
- **RESIDENT (Owner)**: Flat owner. Pays maintenance, raises complaints, pre-approves guests, votes in polls.
- **TENANT**: Similar to resident with flat association.
- **GUARD**: Gate security personnel with a high-contrast touch interface for check-ins, deliveries, and staff attendance.
- **VENDOR**: Local service technicians (electricians, plumbers) receiving assigned tickets.
- **ACCOUNTANT**: Manages manual receipts, payment reconciliation, and defaulter tracking.

---

## 3. Implemented Modules in MVP
- **Auth & Multi-Tenancy**: Phone OTP + Password authentication, JWT session cookies, tenant isolation via `societyId`.
- **Flat Hierarchy & Residents**: Blocks/Towers, Flats, Resident assignment, and bulk CSV import.
- **Maintenance Billing & Payments**: Sqft, fixed rate, parking, sinking fund, late fee, and Razorpay UPI payments with idempotent webhooks.
- **Helpdesk & Complaints**: SLA clock, priority levels, category assignment, photo proof simulation, and comment threads.
- **Gate & Visitor Management**: Touch guard terminal, 4-digit guest entry pass, approval pings, parcel deliveries.
- **Notices & Polls**: Targeted audience notices, democratic 1-vote polling with live percentage bars.
- **Staff Attendance & Verified Vendors**: Daily punch register, verified vendor catalog, and service booking.
- **Super Admin Platform**: Platform MRR, ARR, society lifecycle, and auditable impersonation.

