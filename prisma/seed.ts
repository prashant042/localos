import { PrismaClient, SystemRoleType, SocietyStatus, FlatType, OccupancyStatus, ResidentType, InvoiceBillingCycle, CalculationMethod, InvoiceStatus, LineItemChargeType, PaymentMethod, PaymentGateway, PaymentStatus, ComplaintPriority, ComplaintStatus, NoticeAudience, NoticePriority, PollStatus, VisitorType, VisitorStatus, DeliveryStatus, StaffRole, AttendanceStatus } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting LocalOS database seed...');

  // 1. Password Hashes
  const adminPasswordHash = await bcrypt.hash('Admin@123', 10);
  const residentPasswordHash = await bcrypt.hash('Resident@123', 10);
  const guardPasswordHash = await bcrypt.hash('Guard@123', 10);
  const vendorPasswordHash = await bcrypt.hash('Vendor@123', 10);

  // 2. Subscription Plans
  console.log('📦 Seeding Subscription Plans...');
  const plans = [
    {
      id: 'plan-starter',
      name: 'Starter Community',
      tier: 'STARTER' as const,
      maxFlats: 100,
      priceMonthly: 1999,
      priceYearly: 19990,
      features: ['billing', 'complaints', 'gatekeeper', 'notices', 'polls'],
    },
    {
      id: 'plan-growth',
      name: 'Growth Society',
      tier: 'GROWTH' as const,
      maxFlats: 500,
      priceMonthly: 4999,
      priceYearly: 49990,
      features: ['billing', 'complaints', 'gatekeeper', 'notices', 'polls', 'staff', 'vendors', 'documents'],
    },
    {
      id: 'plan-enterprise',
      name: 'Enterprise Gated City',
      tier: 'ENTERPRISE' as const,
      maxFlats: 5000,
      priceMonthly: 12999,
      priceYearly: 129990,
      features: ['billing', 'complaints', 'gatekeeper', 'notices', 'polls', 'staff', 'vendors', 'documents', 'analytics', 'whatsapp'],
    },
  ];

  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { id: p.id },
      update: p,
      create: p,
    });
  }

  // 3. Super Admin User
  console.log('👑 Seeding Super Admin...');
  const superAdmin = await prisma.user.upsert({
    where: { phone: '9999900000' },
    update: {},
    create: {
      fullName: 'Antigravity Super Admin',
      phone: '9999900000',
      email: 'superadmin@localos.in',
      passwordHash: adminPasswordHash,
      isSuperAdmin: true,
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  });

  // 4. Greenwood Heights RWA (Demo Society)
  console.log('🏢 Seeding Demo Society (Greenwood Heights RWA)...');
  const society = await prisma.society.upsert({
    where: { code: 'GHRWA' },
    update: {},
    create: {
      name: 'Greenwood Heights RWA',
      slug: 'greenwood-heights',
      code: 'GHRWA',
      address: 'Plot 42, Outer Ring Road, Bellandur',
      city: 'Bengaluru',
      state: 'Karnataka',
      pincode: '560103',
      country: 'India',
      contactEmail: 'committee@greenwood.in',
      contactPhone: '9876543210',
      registrationNumber: 'DRB-3/SOR/1042/2021-22',
      gstNumber: '29AABCG1234F1Z8',
      status: SocietyStatus.ACTIVE,
    },
  });

  // Link Growth Subscription to Society
  await prisma.societySubscription.create({
    data: {
      societyId: society.id,
      planId: 'plan-growth',
      startDate: new Date('2026-01-01'),
      endDate: new Date('2027-01-01'),
      status: 'ACTIVE',
      autoRenew: true,
    },
  }).catch(() => {});

  // Module settings
  const modules = ['billing', 'complaints', 'gatekeeper', 'notices', 'polls', 'staff', 'vendors', 'documents'];
  for (const mod of modules) {
    await prisma.moduleSetting.upsert({
      where: { societyId_moduleKey: { societyId: society.id, moduleKey: mod } },
      update: { isEnabled: true },
      create: { societyId: society.id, moduleKey: mod, isEnabled: true },
    });
  }

  // 5. Blocks and Floors
  console.log('🏗️ Seeding Blocks, Floors & Flats...');
  const blockA = await prisma.block.upsert({
    where: { societyId_code: { societyId: society.id, code: 'A' } },
    update: {},
    create: { societyId: society.id, name: 'Tower A (Aspen)', code: 'A' },
  });

  const blockB = await prisma.block.upsert({
    where: { societyId_code: { societyId: society.id, code: 'B' } },
    update: {},
    create: { societyId: society.id, name: 'Tower B (Birch)', code: 'B' },
  });

  // Flats in Tower A & B
  const flatA101 = await prisma.flat.upsert({
    where: { societyId_flatNumber: { societyId: society.id, flatNumber: 'A-101' } },
    update: {},
    create: {
      societyId: society.id,
      blockId: blockA.id,
      flatNumber: 'A-101',
      flatType: FlatType.BHK_2,
      areaSqFt: 1250,
      occupancyStatus: OccupancyStatus.OWNER_OCCUPIED,
      intercomNumber: '101',
      parkingSlots: 'P-101',
    },
  });

  const flatA402 = await prisma.flat.upsert({
    where: { societyId_flatNumber: { societyId: society.id, flatNumber: 'A-402' } },
    update: {},
    create: {
      societyId: society.id,
      blockId: blockA.id,
      flatNumber: 'A-402',
      flatType: FlatType.BHK_3,
      areaSqFt: 1750,
      occupancyStatus: OccupancyStatus.OWNER_OCCUPIED,
      intercomNumber: '402',
      parkingSlots: 'P-402, P-403',
    },
  });

  const flatB201 = await prisma.flat.upsert({
    where: { societyId_flatNumber: { societyId: society.id, flatNumber: 'B-201' } },
    update: {},
    create: {
      societyId: society.id,
      blockId: blockB.id,
      flatNumber: 'B-201',
      flatType: FlatType.BHK_2,
      areaSqFt: 1300,
      occupancyStatus: OccupancyStatus.TENANT_OCCUPIED,
      intercomNumber: '201',
      parkingSlots: 'P-201',
    },
  });

  const flatB504 = await prisma.flat.upsert({
    where: { societyId_flatNumber: { societyId: society.id, flatNumber: 'B-504' } },
    update: {},
    create: {
      societyId: society.id,
      blockId: blockB.id,
      flatNumber: 'B-504',
      flatType: FlatType.PENTHOUSE,
      areaSqFt: 2800,
      occupancyStatus: OccupancyStatus.OWNER_OCCUPIED,
      intercomNumber: '504',
      parkingSlots: 'P-504, P-505',
    },
  });

  // 6. Users & Memberships
  console.log('👥 Seeding Society Committee, Residents, Guard & Vendors...');
  
  // Society Admin: Rajesh Sharma (President)
  const userAdmin = await prisma.user.upsert({
    where: { phone: '9876543210' },
    update: {},
    create: {
      fullName: 'Rajesh Sharma',
      phone: '9876543210',
      email: 'rajesh.sharma@greenwood.in',
      passwordHash: adminPasswordHash,
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  });

  await prisma.societyMember.upsert({
    where: { societyId_userId: { societyId: society.id, userId: userAdmin.id } },
    update: {},
    create: { societyId: society.id, userId: userAdmin.id, memberType: SystemRoleType.SOCIETY_ADMIN },
  });

  await prisma.residentProfile.upsert({
    where: { id: 'prof-admin' },
    update: {},
    create: {
      id: 'prof-admin',
      societyId: society.id,
      userId: userAdmin.id,
      flatId: flatA101.id,
      residentType: ResidentType.OWNER,
      isPrimaryResident: true,
    },
  });

  // Committee Member: Sunita Rao (Secretary)
  const userSecretary = await prisma.user.upsert({
    where: { phone: '9876543211' },
    update: {},
    create: {
      fullName: 'Sunita Rao',
      phone: '9876543211',
      email: 'sunita.rao@greenwood.in',
      passwordHash: adminPasswordHash,
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  });

  await prisma.societyMember.upsert({
    where: { societyId_userId: { societyId: society.id, userId: userSecretary.id } },
    update: {},
    create: { societyId: society.id, userId: userSecretary.id, memberType: SystemRoleType.COMMITTEE_MEMBER },
  });

  // Resident Owner: Amit Patel (Flat A-402)
  const userResident = await prisma.user.upsert({
    where: { phone: '9876543212' },
    update: {},
    create: {
      fullName: 'Amit Patel',
      phone: '9876543212',
      email: 'amit.patel@gmail.com',
      passwordHash: residentPasswordHash,
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  });

  await prisma.societyMember.upsert({
    where: { societyId_userId: { societyId: society.id, userId: userResident.id } },
    update: {},
    create: { societyId: society.id, userId: userResident.id, memberType: SystemRoleType.RESIDENT },
  });

  await prisma.residentProfile.upsert({
    where: { id: 'prof-amit' },
    update: {},
    create: {
      id: 'prof-amit',
      societyId: society.id,
      userId: userResident.id,
      flatId: flatA402.id,
      residentType: ResidentType.OWNER,
      isPrimaryResident: true,
    },
  });

  // Resident Tenant: Priya Verma (Flat B-201)
  const userTenant = await prisma.user.upsert({
    where: { phone: '9876543213' },
    update: {},
    create: {
      fullName: 'Priya Verma',
      phone: '9876543213',
      email: 'priya.verma@gmail.com',
      passwordHash: residentPasswordHash,
      isPhoneVerified: true,
      isEmailVerified: true,
    },
  });

  await prisma.societyMember.upsert({
    where: { societyId_userId: { societyId: society.id, userId: userTenant.id } },
    update: {},
    create: { societyId: society.id, userId: userTenant.id, memberType: SystemRoleType.TENANT },
  });

  await prisma.residentProfile.upsert({
    where: { id: 'prof-priya' },
    update: {},
    create: {
      id: 'prof-priya',
      societyId: society.id,
      userId: userTenant.id,
      flatId: flatB201.id,
      residentType: ResidentType.TENANT,
      isPrimaryResident: true,
    },
  });

  // Security Guard: Ramesh Bahadur
  const userGuard = await prisma.user.upsert({
    where: { phone: '9876543214' },
    update: {},
    create: {
      fullName: 'Ramesh Bahadur (Gate 1)',
      phone: '9876543214',
      email: 'ramesh.guard@greenwood.in',
      passwordHash: guardPasswordHash,
      isPhoneVerified: true,
    },
  });

  await prisma.societyMember.upsert({
    where: { societyId_userId: { societyId: society.id, userId: userGuard.id } },
    update: {},
    create: { societyId: society.id, userId: userGuard.id, memberType: SystemRoleType.GUARD },
  });

  const staffGuard = await prisma.staff.upsert({
    where: { userId: userGuard.id },
    update: {},
    create: {
      societyId: society.id,
      userId: userGuard.id,
      name: 'Ramesh Bahadur',
      phone: '9876543214',
      role: StaffRole.SECURITY_GUARD,
      shiftStart: '08:00',
      shiftEnd: '20:00',
      isActive: true,
    },
  });

  // Staff Attendance for today
  await prisma.staffAttendance.upsert({
    where: { staffId_date: { staffId: staffGuard.id, date: new Date('2026-11-12') } },
    update: {},
    create: {
      societyId: society.id,
      staffId: staffGuard.id,
      date: new Date('2026-11-12'),
      checkInTime: new Date('2026-11-12T07:55:00'),
      status: AttendanceStatus.PRESENT,
      notes: 'Morning shift gate 1 on duty',
    },
  });

  // 7. Billing Rules & Invoices
  console.log('💳 Seeding Billing Rules & Invoices...');
  const billingConfig = await prisma.billingConfig.upsert({
    where: { id: 'cfg-ghrwa-standard' },
    update: {},
    create: {
      id: 'cfg-ghrwa-standard',
      societyId: society.id,
      name: 'Standard FY2026-27 Rate Structure',
      billingCycle: InvoiceBillingCycle.MONTHLY,
      calculationMethod: CalculationMethod.PER_SQFT_AREA,
      ratePerSqFt: 3.5, // 3.50 INR / sqft
      sinkingFundAmount: 500,
      parkingChargePerSlot: 250,
      dueDaysFromIssue: 15,
      lateFeeType: 'PERCENTAGE',
      lateFeeValue: 5.0,
      gracePeriodDays: 5,
      gstApplicable: false,
    },
  });

  // Invoices for November 2026
  // Flat A-402: 1750 sqft * 3.5 = 6125 + 500 sinking + 500 parking = 7125 INR (ISSUED / PENDING)
  const invAmit = await prisma.maintenanceInvoice.upsert({
    where: { societyId_invoiceNumber: { societyId: society.id, invoiceNumber: 'INV-GHRWA-202611-0001' } },
    update: {},
    create: {
      societyId: society.id,
      billingConfigId: billingConfig.id,
      invoiceNumber: 'INV-GHRWA-202611-0001',
      flatId: flatA402.id,
      billingPeriodStart: new Date('2026-11-01'),
      billingPeriodEnd: new Date('2026-11-30'),
      issueDate: new Date('2026-11-01'),
      dueDate: new Date('2026-11-16'),
      baseAmount: 6125,
      sinkingFund: 500,
      parkingCharges: 500,
      totalAmount: 7125,
      paidAmount: 0,
      balanceAmount: 7125,
      status: InvoiceStatus.ISSUED,
      notes: 'November 2026 Regular Maintenance',
      lineItems: {
        create: [
          { title: 'Base Maintenance (1750 sq.ft @ ₹3.50/sqft)', chargeType: LineItemChargeType.MAINTENANCE, amount: 6125, totalAmount: 6125 },
          { title: 'Sinking Fund Contribution', chargeType: LineItemChargeType.SINKING_FUND, amount: 500, totalAmount: 500 },
          { title: 'Parking Slots (2 slots @ ₹250/slot)', chargeType: LineItemChargeType.PARKING, amount: 500, totalAmount: 500 },
        ],
      },
    },
  });

  // Flat A-101: 1250 sqft * 3.5 = 4375 + 500 sinking + 250 parking = 5125 INR (PAID via Razorpay UPI)
  const invAdmin = await prisma.maintenanceInvoice.upsert({
    where: { societyId_invoiceNumber: { societyId: society.id, invoiceNumber: 'INV-GHRWA-202611-0002' } },
    update: {},
    create: {
      societyId: society.id,
      billingConfigId: billingConfig.id,
      invoiceNumber: 'INV-GHRWA-202611-0002',
      flatId: flatA101.id,
      billingPeriodStart: new Date('2026-11-01'),
      billingPeriodEnd: new Date('2026-11-30'),
      issueDate: new Date('2026-11-01'),
      dueDate: new Date('2026-11-16'),
      baseAmount: 4375,
      sinkingFund: 500,
      parkingCharges: 250,
      totalAmount: 5125,
      paidAmount: 5125,
      balanceAmount: 0,
      status: InvoiceStatus.PAID,
      notes: 'November 2026 Regular Maintenance',
      lineItems: {
        create: [
          { title: 'Base Maintenance (1250 sq.ft @ ₹3.50/sqft)', chargeType: LineItemChargeType.MAINTENANCE, amount: 4375, totalAmount: 4375 },
          { title: 'Sinking Fund Contribution', chargeType: LineItemChargeType.SINKING_FUND, amount: 500, totalAmount: 500 },
          { title: 'Parking Slot (1 slot @ ₹250/slot)', chargeType: LineItemChargeType.PARKING, amount: 250, totalAmount: 250 },
        ],
      },
    },
  });

  // Seed Payment for Flat A-101
  await prisma.payment.upsert({
    where: { societyId_paymentNumber: { societyId: society.id, paymentNumber: 'RCPT-GHRWA-202611-0001' } },
    update: {},
    create: {
      societyId: society.id,
      invoiceId: invAdmin.id,
      paymentNumber: 'RCPT-GHRWA-202611-0001',
      amount: 5125,
      paymentMethod: PaymentMethod.UPI,
      paymentGateway: PaymentGateway.RAZORPAY,
      gatewayOrderId: 'order_GHRWA_202611_0001',
      gatewayPaymentId: 'pay_rzp_mock_12345678',
      status: PaymentStatus.SUCCESS,
      paidAt: new Date('2026-11-03T11:30:00'),
      remarks: 'Paid via Google Pay UPI (Reference: UPI/6312/0042)',
    },
  });

  // 8. Complaints & Categories
  console.log('🛠️ Seeding Helpdesk & Complaints...');
  const catPlumbing = await prisma.complaintCategory.upsert({
    where: { societyId_name: { societyId: society.id, name: 'Plumbing & Water' } },
    update: {},
    create: {
      societyId: society.id,
      name: 'Plumbing & Water',
      description: 'Water leakage, low pressure, seepage, tap fixes',
      slaHours: 24,
      icon: 'droplets',
    },
  });

  const catElectrical = await prisma.complaintCategory.upsert({
    where: { societyId_name: { societyId: society.id, name: 'Electrical & Power' } },
    update: {},
    create: {
      societyId: society.id,
      name: 'Electrical & Power',
      description: 'MCB trips, corridor light replacements, DG backup issues',
      slaHours: 12,
      icon: 'zap',
    },
  });

  const catLift = await prisma.complaintCategory.upsert({
    where: { societyId_name: { societyId: society.id, name: 'Elevator & Lifts' } },
    update: {},
    create: {
      societyId: society.id,
      name: 'Elevator & Lifts',
      description: 'Lift breakdown, floor sensor errors, jerky stops',
      slaHours: 4,
      icon: 'arrow-up-down',
    },
  });

  // Sample Ticket: Pipeline leakage in Basement Wing A
  await prisma.complaint.upsert({
    where: { societyId_ticketNumber: { societyId: society.id, ticketNumber: 'TKT-GHRWA-2026-0001' } },
    update: {},
    create: {
      societyId: society.id,
      ticketNumber: 'TKT-GHRWA-2026-0001',
      flatId: flatA402.id,
      createdById: userResident.id,
      categoryId: catPlumbing.id,
      title: 'Water leakage from main drainage pipe in Tower A basement',
      description: 'Significant water pooling near parking slot P-402 since yesterday evening. Needs urgent attention to prevent dampness.',
      priority: ComplaintPriority.HIGH,
      status: ComplaintStatus.IN_PROGRESS,
      locationDetails: 'Basement 1, near pillar 24 and parking slot P-402',
      dueAt: new Date('2026-11-13T18:00:00'),
      comments: {
        create: [
          { authorId: userAdmin.id, comment: 'Assigned to Apex Plumbing team. Vikram will inspect tomorrow morning at 10 AM.', isInternal: false },
        ],
      },
    },
  });

  // 9. Notices & Polls
  console.log('📢 Seeding Notices & Polls...');
  await prisma.notice.create({
    data: {
      societyId: society.id,
      title: 'Water Tank Cleaning Schedule — Tower A & B',
      content: 'Please note that the overhead and underground water tanks will be sanitized this Saturday (14th Nov) between 9:00 AM to 2:00 PM. Water supply will be unavailable during this window. Residents are advised to store sufficient water in advance.',
      audience: NoticeAudience.ALL_RESIDENTS,
      priority: NoticePriority.IMPORTANT,
      publishedById: userAdmin.id,
      isPinned: true,
    },
  }).catch(() => {});

  const poll = await prisma.poll.create({
    data: {
      societyId: society.id,
      title: 'Should Greenwood Heights install dedicated EV charging stations in Basement 1?',
      description: 'The RWA committee proposes installing 6 fast AC chargers powered by a shared load manager. Setup cost will be recovered via per-unit consumption billing.',
      createdById: userAdmin.id,
      endsAt: new Date('2026-11-30T23:59:59'),
      status: PollStatus.ACTIVE,
      options: {
        create: [
          { text: 'Yes, definitely required (I own / plan to buy an EV)', voteCount: 42 },
          { text: 'Yes, but only if user pays subscription', voteCount: 28 },
          { text: 'No, not needed currently', voteCount: 6 },
        ],
      },
    },
  }).catch(() => {});

  // 10. Gate Visitors & Deliveries
  console.log('🚪 Seeding Gate Visitors & Deliveries...');
  const visitorGuest = await prisma.visitor.create({
    data: {
      societyId: society.id,
      name: 'Sunil Mehta',
      phone: '9845012345',
      visitorType: VisitorType.GUEST,
      vehicleNumber: 'KA-01-MJ-4052',
    },
  });

  await prisma.visitorLog.create({
    data: {
      societyId: society.id,
      visitorId: visitorGuest.id,
      flatId: flatA402.id,
      guardId: userGuard.id,
      purpose: 'Family visit',
      status: VisitorStatus.APPROVED,
      entryTime: new Date('2026-11-12T14:15:00'),
    },
  });

  await prisma.deliveryLog.create({
    data: {
      societyId: society.id,
      flatId: flatB201.id,
      company: 'Swiggy',
      deliveryPersonName: 'Mohammed Arif',
      phone: '9741098765',
      status: DeliveryStatus.HANDED_TO_RESIDENT,
    },
  });

  // 11. Vendors & Service Directory
  console.log('🔧 Seeding Vendors & Services...');
  const vendorPlumbing = await prisma.vendor.create({
    data: {
      societyId: society.id,
      companyName: 'Apex Plumbing & Water Solutions',
      contactPerson: 'Vikram Singh',
      phone: '9876543215',
      email: 'vikram.plumber@gmail.com',
      category: 'Plumbing & Sanitation',
      rating: 4.8,
      gstNumber: '29AABCA9876B1Z5',
      address: '22, Sarjapur Main Road, Bengaluru',
      services: {
        create: [
          { serviceName: 'RO Water Purifier Servicing', basePrice: 450, description: 'Filter replacement, TDS check & sanitization' },
          { serviceName: 'Tap / Mixer Valve Replacement', basePrice: 250, description: 'Fix leaking bathroom or kitchen mixer taps' },
        ],
      },
    },
  });

  console.log('✅ LocalOS database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

