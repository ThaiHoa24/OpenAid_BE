import {
  PrismaClient,
  SystemRole,
  OrganizationRole,
  OrgStatus,
  EventStatus,
  DonationStatus,
  BatchStatus,
  TripStatus,
  TripVolunteerRole,
  DistributionPointStatus,
  EvidenceReviewStatus,
  VolunteerApplicationStatus,
  TransparencyEntityType,
  Prisma,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

const ids = {
  // Primary FE 1-Click Demo Users (@openaid.demo)
  feAdmin: '10000000-0000-4000-8000-000000000011',
  feOrganizer: '10000000-0000-4000-8000-000000000012',
  feUser: '10000000-0000-4000-8000-000000000013',
  feVolunteerB: '10000000-0000-4000-8000-000000000014',

  // Secondary BE Docs Demo Users (@example.test)
  admin: '10000000-0000-4000-8000-000000000001',
  organizer: '10000000-0000-4000-8000-000000000002',
  donor: '10000000-0000-4000-8000-000000000003',
  leader: '10000000-0000-4000-8000-000000000004',
  volunteer: '10000000-0000-4000-8000-000000000005',

  // Organizations
  organization: '20000000-0000-4000-8000-000000000001',
  pendingOrg: '20000000-0000-4000-8000-000000000002',

  // Events
  eventPublished: '30000000-0000-4000-8000-000000000001',
  eventDraft: '30000000-0000-4000-8000-000000000002',
  eventClosed: '30000000-0000-4000-8000-000000000003',

  // Volunteer Roles
  roleLeader: '40000000-0000-4000-8000-000000000001',
  roleMember: '40000000-0000-4000-8000-000000000002',

  // Volunteer Applications
  appFeUser: '45000000-0000-4000-8000-000000000001',
  appFeVolB: '45000000-0000-4000-8000-000000000002',
  appLeader: '45000000-0000-4000-8000-000000000003',
  appMember: '45000000-0000-4000-8000-000000000004',

  // Catalogs: ItemTypes & Units
  rice: '50000000-0000-4000-8000-000000000001',
  water: '50000000-0000-4000-8000-000000000002',
  noodles: '50000000-0000-4000-8000-000000000003',

  kg: '60000000-0000-4000-8000-000000000001',
  bottle: '60000000-0000-4000-8000-000000000002',
  box: '60000000-0000-4000-8000-000000000003',

  // Donation Needs
  needRice: '65000000-0000-4000-8000-000000000001',
  needWater: '65000000-0000-4000-8000-000000000002',
  needNoodles: '65000000-0000-4000-8000-000000000003',

  // Donations (4 FE Sample Tracking Codes + 1 BE Demo Code)
  donDistributed: '70000000-0000-4000-8000-000000000001',
  donInBatch: '70000000-0000-4000-8000-000000000002',
  donReceived: '70000000-0000-4000-8000-000000000003',
  donPending: '70000000-0000-4000-8000-000000000004',
  donTrkDemo: '70000000-0000-4000-8000-000000000005',

  // Inventories
  inventoryRice: '75000000-0000-4000-8000-000000000001',
  inventoryWater: '75000000-0000-4000-8000-000000000002',

  // Batches
  batchRiceAssigned: '80000000-0000-4000-8000-000000000001',
  batchWaterAssigned: '80000000-0000-4000-8000-000000000002',
  batchRiceReady: '80000000-0000-4000-8000-000000000003',

  // Trips & TripBatches
  trip1: '90000000-0000-4000-8000-000000000001',
  tripBatchRice: '91000000-0000-4000-8000-000000000001',
  tripBatchWater: '91000000-0000-4000-8000-000000000002',

  // Trip Volunteers
  tripVolFeLeader: '92000000-0000-4000-8000-000000000001',
  tripVolFeMember: '92000000-0000-4000-8000-000000000002',
  tripVolBeLeader: '92000000-0000-4000-8000-000000000003',

  // Distribution Points
  point1: '95000000-0000-4000-8000-000000000001',
  point2: '95000000-0000-4000-8000-000000000002',

  // Distribution Records & Evidences
  record1: '96000000-0000-4000-8000-000000000001',
  evidenceApproved: '97000000-0000-4000-8000-000000000001',
  evidencePending: '97000000-0000-4000-8000-000000000002',
};

async function main() {
  const fePasswordHash = await bcrypt.hash('123456', 10);
  const bePasswordHash = await bcrypt.hash('OpenAidDemo123!', 10);

  await prisma.$transaction(async (tx) => {
    // 1. Tạo Users (cả bộ tài khoản 1-Click FE @openaid.demo lẫn tài khoản BE @example.test)
    const usersData = [
      [
        ids.feAdmin,
        'admin@openaid.demo',
        'Quản Trị Hệ Thống OpenAid',
        SystemRole.ADMIN,
        fePasswordHash,
        '0905000001',
      ],
      [
        ids.feOrganizer,
        'organizer@openaid.demo',
        'Ban Tổ Chức Helping Hands Đà Nẵng',
        SystemRole.USER,
        fePasswordHash,
        '0905000002',
      ],
      [
        ids.feUser,
        'user@openaid.demo',
        'Nguyễn Minh Quân (Trưởng đoàn & Nhà hảo tâm)',
        SystemRole.USER,
        fePasswordHash,
        '0905000003',
      ],
      [
        ids.feVolunteerB,
        'volunteer.b@openaid.demo',
        'Trần Thị Thu Hà (Tình nguyện viên)',
        SystemRole.USER,
        fePasswordHash,
        '0905000004',
      ],
      [
        ids.admin,
        'admin@example.test',
        'Demo Admin',
        SystemRole.ADMIN,
        bePasswordHash,
        '0905111001',
      ],
      [
        ids.organizer,
        'organizer@example.test',
        'Demo Organizer',
        SystemRole.USER,
        bePasswordHash,
        '0905111002',
      ],
      [
        ids.donor,
        'donor@example.test',
        'Nhà hảo tâm Demo',
        SystemRole.USER,
        bePasswordHash,
        '0905111003',
      ],
      [
        ids.leader,
        'leader@example.test',
        'Đội trưởng Chuyến xe',
        SystemRole.USER,
        bePasswordHash,
        '0905111004',
      ],
      [
        ids.volunteer,
        'volunteer@example.test',
        'Tình nguyện viên Demo',
        SystemRole.USER,
        bePasswordHash,
        '0905111005',
      ],
    ];

    for (const [
      id,
      email,
      fullName,
      systemRole,
      passwordHash,
      phoneNumber,
    ] of usersData) {
      await tx.user.upsert({
        where: { email },
        update: {
          fullName,
          passwordHash,
          systemRole,
          phoneNumber,
          isActive: true,
        },
        create: {
          id,
          email,
          fullName,
          passwordHash,
          systemRole,
          phoneNumber,
          isActive: true,
        },
      });
    }

    const feAdmin = await tx.user.findUniqueOrThrow({
      where: { email: 'admin@openaid.demo' },
    });
    const feOrganizer = await tx.user.findUniqueOrThrow({
      where: { email: 'organizer@openaid.demo' },
    });
    const feUser = await tx.user.findUniqueOrThrow({
      where: { email: 'user@openaid.demo' },
    });
    const feVolB = await tx.user.findUniqueOrThrow({
      where: { email: 'volunteer.b@openaid.demo' },
    });
    const organizer = await tx.user.findUniqueOrThrow({
      where: { email: 'organizer@example.test' },
    });
    const leader = await tx.user.findUniqueOrThrow({
      where: { email: 'leader@example.test' },
    });
    const volunteer = await tx.user.findUniqueOrThrow({
      where: { email: 'volunteer@example.test' },
    });

    // 2. Tạo Tổ chức (1 APPROVED + 1 PENDING để Admin demo duyệt)
    const organization = await tx.organization.upsert({
      where: { code: 'OPENAID-DEMO' },
      update: { status: OrgStatus.APPROVED },
      create: {
        id: ids.organization,
        createdById: feOrganizer.id,
        code: 'OPENAID-DEMO',
        name: 'Hội Cứu Trợ & Bác Ái OpenAid Đà Nẵng',
        email: 'contact@openaid.demo',
        phoneNumber: '0905000002',
        address: '45 Nguyễn Chí Thanh, Quận Hải Châu, TP Đà Nẵng',
        description:
          'Tổ chức thiện nguyện điều phối cứu trợ khẩn cấp miền Trung',
        status: OrgStatus.APPROVED,
        reviewedById: feAdmin.id,
        reviewedAt: new Date('2026-11-01T08:00:00+07:00'),
      },
    });

    await tx.organization.upsert({
      where: { code: 'RELIEF-QN-PENDING' },
      update: { status: OrgStatus.PENDING },
      create: {
        id: ids.pendingOrg,
        createdById: feVolB.id,
        code: 'RELIEF-QN-PENDING',
        name: 'Quỹ Thiện Nguyện Xanh Quảng Nam',
        email: 'quythiennguyen@quangnam.demo',
        phoneNumber: '0905888999',
        address: 'TP Tam Kỳ, Tỉnh Quảng Nam',
        description:
          'Tổ chức đăng ký mới đang chờ Quản trị viên phê duyệt pháp lý',
        status: OrgStatus.PENDING,
      },
    });

    for (const orgUser of [feOrganizer, organizer]) {
      await tx.organizationMember.upsert({
        where: {
          userId_organizationId: {
            userId: orgUser.id,
            organizationId: organization.id,
          },
        },
        update: { role: OrganizationRole.ORGANIZER },
        create: {
          userId: orgUser.id,
          organizationId: organization.id,
          role: OrganizationRole.ORGANIZER,
        },
      });
    }

    // 3. Đơn vị tính & Loại hàng
    const units = [
      [ids.kg, 'KG', 'Kilogram'],
      [ids.bottle, 'BOTTLE', 'Chai'],
      [ids.box, 'BOX', 'Thùng'],
    ];
    for (const [id, code, name] of units) {
      await tx.unit.upsert({
        where: { code },
        update: { name, isActive: true },
        create: { id, code, name, isActive: true },
      });
    }

    const items = [
      [ids.rice, 'RICE', 'Gạo cứu trợ', 'Food'],
      [ids.water, 'WATER', 'Nước khoáng đóng chai', 'Beverages'],
      [ids.noodles, 'NOODLES', 'Mì tôm ăn liền', 'Food'],
    ];
    for (const [id, code, name, category] of items) {
      await tx.itemType.upsert({
        where: { code },
        update: { name, category, isActive: true },
        create: { id, code, name, category, isActive: true },
      });
    }

    const itemRice = await tx.itemType.findUniqueOrThrow({
      where: { code: 'RICE' },
    });
    const itemWater = await tx.itemType.findUniqueOrThrow({
      where: { code: 'WATER' },
    });
    const itemNoodles = await tx.itemType.findUniqueOrThrow({
      where: { code: 'NOODLES' },
    });

    const unitKg = await tx.unit.findUniqueOrThrow({ where: { code: 'KG' } });
    const unitBottle = await tx.unit.findUniqueOrThrow({
      where: { code: 'BOTTLE' },
    });
    const unitBox = await tx.unit.findUniqueOrThrow({ where: { code: 'BOX' } });

    // 4. Các Sự kiện cứu trợ (PUBLISHED, DRAFT, CLOSED)
    await tx.event.upsert({
      where: { id: ids.eventPublished },
      update: { status: EventStatus.PUBLISHED },
      create: {
        id: ids.eventPublished,
        organizationId: organization.id,
        title: 'Cứu trợ khẩn cấp bà con vùng lũ Hòa Vang',
        createdById: feOrganizer.id,
        description:
          'Chiến dịch tiếp nhận nhu yếu phẩm và điều phối trực tiếp tới các hộ dân cô lập tại Hòa Vang, Đà Nẵng.',
        location: 'Huyện Hòa Vang, TP Đà Nẵng',
        contactName: 'Phan Vĩnh Thái Hòa',
        contactPhone: '0905123456',
        startDate: new Date('2026-11-01T08:00:00+07:00'),
        endDate: new Date('2026-12-15T18:00:00+07:00'),
        status: EventStatus.PUBLISHED,
      },
    });

    await tx.event.upsert({
      where: { id: ids.eventDraft },
      update: { status: EventStatus.DRAFT },
      create: {
        id: ids.eventDraft,
        organizationId: organization.id,
        title: 'Chiến dịch Áo ấm & Lương thực vùng cao Nam Trà My',
        createdById: feOrganizer.id,
        description:
          'Bản nháp chiến dịch chuẩn bị nhu yếu phẩm mùa mưa bão cho các điểm trường vùng cao Quảng Nam.',
        location: 'Huyện Nam Trà My, Quảng Nam',
        contactName: 'Nguyễn Minh Quân',
        contactPhone: '0905000002',
        startDate: new Date('2026-11-20T08:00:00+07:00'),
        endDate: new Date('2026-12-30T18:00:00+07:00'),
        status: EventStatus.DRAFT,
      },
    });

    await tx.event.upsert({
      where: { id: ids.eventClosed },
      update: { status: EventStatus.CLOSED },
      create: {
        id: ids.eventClosed,
        organizationId: organization.id,
        title: 'Hỗ trợ khắc phục sau lũ A Lưới - Thừa Thiên Huế',
        createdById: feOrganizer.id,
        description:
          'Chiến dịch đã hoàn tất tiếp nhận và đóng sổ để tổng kết nghiệm thu.',
        location: 'Huyện A Lưới, Thừa Thiên Huế',
        contactName: 'Phan Vĩnh Thái Hòa',
        contactPhone: '0905123456',
        startDate: new Date('2026-10-01T08:00:00+07:00'),
        endDate: new Date('2026-10-28T18:00:00+07:00'),
        status: EventStatus.CLOSED,
      },
    });

    // 5. Nhu cầu quyên góp (Donation Needs) cho Event chính
    const needRice = await tx.donationNeed.upsert({
      where: {
        eventId_itemTypeId_unitId: {
          eventId: ids.eventPublished,
          itemTypeId: itemRice.id,
          unitId: unitKg.id,
        },
      },
      update: { targetQuantity: new Prisma.Decimal(1000) },
      create: {
        id: ids.needRice,
        eventId: ids.eventPublished,
        itemTypeId: itemRice.id,
        unitId: unitKg.id,
        targetQuantity: new Prisma.Decimal(1000),
        notes: 'Ưu tiên gạo đóng bao 10kg - 20kg chống ẩm',
      },
    });

    const needWater = await tx.donationNeed.upsert({
      where: {
        eventId_itemTypeId_unitId: {
          eventId: ids.eventPublished,
          itemTypeId: itemWater.id,
          unitId: unitBottle.id,
        },
      },
      update: { targetQuantity: new Prisma.Decimal(2000) },
      create: {
        id: ids.needWater,
        eventId: ids.eventPublished,
        itemTypeId: itemWater.id,
        unitId: unitBottle.id,
        targetQuantity: new Prisma.Decimal(2000),
        notes: 'Nước suối đóng chai 500ml hoặc 1.5L nguyên thùng',
      },
    });

    await tx.donationNeed.upsert({
      where: {
        eventId_itemTypeId_unitId: {
          eventId: ids.eventPublished,
          itemTypeId: itemNoodles.id,
          unitId: unitBox.id,
        },
      },
      update: { targetQuantity: new Prisma.Decimal(500) },
      create: {
        id: ids.needNoodles,
        eventId: ids.eventPublished,
        itemTypeId: itemNoodles.id,
        unitId: unitBox.id,
        targetQuantity: new Prisma.Decimal(500),
        notes: 'Mì ăn liền thùng 30 gói còn hạn sử dụng trên 6 tháng',
      },
    });

    // 6. Vai trò tình nguyện viên (Volunteer Roles)
    await tx.volunteerRole.upsert({
      where: { id: ids.roleLeader },
      update: { quantity: 3 },
      create: {
        id: ids.roleLeader,
        eventId: ids.eventPublished,
        name: 'Trưởng đoàn điều phối chuyến xe',
        description:
          'Phụ trách chuyến xe, dẫn đoàn và đối soát cấp phát tại các điểm đến',
        quantity: 3,
      },
    });

    await tx.volunteerRole.upsert({
      where: { id: ids.roleMember },
      update: { quantity: 15 },
      create: {
        id: ids.roleMember,
        eventId: ids.eventPublished,
        name: 'Tình nguyện viên bốc dỡ & phát quà',
        description: 'Hỗ trợ đóng gói, bốc dỡ và trao quà tận tay bà con',
        quantity: 15,
      },
    });

    // 7. Đơn ứng tuyển TNV (Applications & Attendance)
    const appFeUser = await tx.volunteerApplication.upsert({
      where: {
        eventId_userId: { eventId: ids.eventPublished, userId: feUser.id },
      },
      update: { status: VolunteerApplicationStatus.APPROVED },
      create: {
        id: ids.appFeUser,
        eventId: ids.eventPublished,
        userId: feUser.id,
        volunteerRoleId: ids.roleLeader,
        status: VolunteerApplicationStatus.APPROVED,
        notes: 'Có kinh nghiệm điều phối xe tải cứu trợ vùng lũ',
        reviewedById: feOrganizer.id,
        reviewedAt: new Date('2026-11-02T09:00:00+07:00'),
      },
    });

    const appFeVolB = await tx.volunteerApplication.upsert({
      where: {
        eventId_userId: { eventId: ids.eventPublished, userId: feVolB.id },
      },
      update: { status: VolunteerApplicationStatus.APPROVED },
      create: {
        id: ids.appFeVolB,
        eventId: ids.eventPublished,
        userId: feVolB.id,
        volunteerRoleId: ids.roleMember,
        status: VolunteerApplicationStatus.APPROVED,
        notes: 'Sẵn sàng tham gia đóng gói tại kho và đi theo xe',
        reviewedById: feOrganizer.id,
        reviewedAt: new Date('2026-11-02T09:30:00+07:00'),
      },
    });

    const appLeader = await tx.volunteerApplication.upsert({
      where: {
        eventId_userId: { eventId: ids.eventPublished, userId: leader.id },
      },
      update: { status: VolunteerApplicationStatus.APPROVED },
      create: {
        id: ids.appLeader,
        eventId: ids.eventPublished,
        userId: leader.id,
        volunteerRoleId: ids.roleLeader,
        status: VolunteerApplicationStatus.APPROVED,
        reviewedById: feOrganizer.id,
        reviewedAt: new Date('2026-11-02T10:00:00+07:00'),
      },
    });

    await tx.volunteerApplication.upsert({
      where: {
        eventId_userId: { eventId: ids.eventPublished, userId: volunteer.id },
      },
      update: { status: VolunteerApplicationStatus.PENDING },
      create: {
        id: ids.appMember,
        eventId: ids.eventPublished,
        userId: volunteer.id,
        volunteerRoleId: ids.roleMember,
        status: VolunteerApplicationStatus.PENDING,
        notes: 'Đăng ký hỗ trợ ca chiều cuối tuần',
      },
    });

    // Điểm danh ca trực cho Trưởng đoàn (đúng tên trường schema: checkedInAt, checkedInById)
    await tx.volunteerAttendance.upsert({
      where: { applicationId: appFeUser.id },
      update: {},
      create: {
        id: '46000000-0000-4000-8000-000000000001',
        applicationId: appFeUser.id,
        checkedInAt: new Date('2026-11-05T07:30:00+07:00'),
        checkedInById: feOrganizer.id,
        method: 'MANUAL',
      },
    });

    // 8. Tồn kho khởi tạo (Rice & Water)
    const invRice = await tx.inventory.upsert({
      where: {
        eventId_itemTypeId_unitId: {
          eventId: ids.eventPublished,
          itemTypeId: itemRice.id,
          unitId: unitKg.id,
        },
      },
      update: {
        receivedQuantity: new Prisma.Decimal(310),
        availableQuantity: new Prisma.Decimal(60),
        reservedQuantity: new Prisma.Decimal(150),
        distributedQuantity: new Prisma.Decimal(100),
      },
      create: {
        id: ids.inventoryRice,
        eventId: ids.eventPublished,
        itemTypeId: itemRice.id,
        unitId: unitKg.id,
        receivedQuantity: new Prisma.Decimal(310),
        availableQuantity: new Prisma.Decimal(60),
        reservedQuantity: new Prisma.Decimal(150),
        distributedQuantity: new Prisma.Decimal(100),
        lostQuantity: new Prisma.Decimal(0),
      },
    });

    const invWater = await tx.inventory.upsert({
      where: {
        eventId_itemTypeId_unitId: {
          eventId: ids.eventPublished,
          itemTypeId: itemWater.id,
          unitId: unitBottle.id,
        },
      },
      update: {
        receivedQuantity: new Prisma.Decimal(500),
        availableQuantity: new Prisma.Decimal(0),
        reservedQuantity: new Prisma.Decimal(500),
        distributedQuantity: new Prisma.Decimal(0),
      },
      create: {
        id: ids.inventoryWater,
        eventId: ids.eventPublished,
        itemTypeId: itemWater.id,
        unitId: unitBottle.id,
        receivedQuantity: new Prisma.Decimal(500),
        availableQuantity: new Prisma.Decimal(0),
        reservedQuantity: new Prisma.Decimal(500),
        distributedQuantity: new Prisma.Decimal(0),
        lostQuantity: new Prisma.Decimal(0),
      },
    });

    // 9. Lô hàng (Batches)
    const batchRice = await tx.batch.upsert({
      where: { id: ids.batchRiceAssigned },
      update: { status: BatchStatus.ASSIGNED },
      create: {
        id: ids.batchRiceAssigned,
        batchCode: 'BAT-2026-DEMO01',
        eventId: ids.eventPublished,
        inventoryId: invRice.id,
        itemTypeId: itemRice.id,
        unitId: unitKg.id,
        quantity: new Prisma.Decimal(250),
        status: BatchStatus.ASSIGNED,
        createdById: feOrganizer.id,
      },
    });

    const batchWater = await tx.batch.upsert({
      where: { id: ids.batchWaterAssigned },
      update: { status: BatchStatus.ASSIGNED },
      create: {
        id: ids.batchWaterAssigned,
        batchCode: 'BAT-2026-WATER02',
        eventId: ids.eventPublished,
        inventoryId: invWater.id,
        itemTypeId: itemWater.id,
        unitId: unitBottle.id,
        quantity: new Prisma.Decimal(500),
        status: BatchStatus.ASSIGNED,
        createdById: feOrganizer.id,
      },
    });

    // 10. Các khoản quyên góp (4 mã mẫu trên trang /track + 1 mã TRK-2026-DEMO01)
    // (1) DON-2026-7K3Q9X: Đã bàn giao tại thôn bản (DISTRIBUTED)
    await tx.donation.upsert({
      where: { trackingId: 'DON-2026-7K3Q9X' },
      update: {
        batchId: batchRice.id,
        status: DonationStatus.DISTRIBUTED,
        receivedQuantity: new Prisma.Decimal(50),
      },
      create: {
        id: ids.donDistributed,
        trackingId: 'DON-2026-7K3Q9X',
        donorId: feUser.id,
        eventId: ids.eventPublished,
        donationNeedId: needRice.id,
        itemTypeId: itemRice.id,
        unitId: unitKg.id,
        quantity: new Prisma.Decimal(50),
        receivedQuantity: new Prisma.Decimal(50),
        photoUrl:
          'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
        status: DonationStatus.DISTRIBUTED,
        batchId: batchRice.id,
        receivedById: feOrganizer.id,
        receivedAt: new Date('2026-11-03T09:00:00+07:00'),
      },
    });

    // (2) DON-2026-5W9K2N: 500 Chai nước khoáng (Đang trên chuyến xe - IN_BATCH)
    await tx.donation.upsert({
      where: { trackingId: 'DON-2026-5W9K2N' },
      update: {
        batchId: batchWater.id,
        status: DonationStatus.IN_BATCH,
        receivedQuantity: new Prisma.Decimal(500),
      },
      create: {
        id: ids.donInBatch,
        trackingId: 'DON-2026-5W9K2N',
        donorId: feUser.id,
        eventId: ids.eventPublished,
        donationNeedId: needWater.id,
        itemTypeId: itemWater.id,
        unitId: unitBottle.id,
        quantity: new Prisma.Decimal(500),
        receivedQuantity: new Prisma.Decimal(500),
        status: DonationStatus.IN_BATCH,
        batchId: batchWater.id,
        receivedById: feOrganizer.id,
        receivedAt: new Date('2026-11-04T10:30:00+07:00'),
      },
    });

    // (3) DON-2026-3H6V8B: 60 kg Gạo cứu trợ (Đã nhập kho an toàn - RECEIVED)
    await tx.donation.upsert({
      where: { trackingId: 'DON-2026-3H6V8B' },
      update: {
        status: DonationStatus.RECEIVED,
        receivedQuantity: new Prisma.Decimal(60),
      },
      create: {
        id: ids.donReceived,
        trackingId: 'DON-2026-3H6V8B',
        donorId: feUser.id,
        eventId: ids.eventPublished,
        donationNeedId: needRice.id,
        itemTypeId: itemRice.id,
        unitId: unitKg.id,
        quantity: new Prisma.Decimal(60),
        receivedQuantity: new Prisma.Decimal(60),
        status: DonationStatus.RECEIVED,
        receivedById: feOrganizer.id,
        receivedAt: new Date('2026-11-04T15:00:00+07:00'),
      },
    });

    // (4) DON-2026-2F7J9K: 50 kg Gạo đóng góp (Mới cam kết - PENDING)
    await tx.donation.upsert({
      where: { trackingId: 'DON-2026-2F7J9K' },
      update: { status: DonationStatus.PENDING },
      create: {
        id: ids.donPending,
        trackingId: 'DON-2026-2F7J9K',
        donorId: feUser.id,
        eventId: ids.eventPublished,
        donationNeedId: needRice.id,
        itemTypeId: itemRice.id,
        unitId: unitKg.id,
        quantity: new Prisma.Decimal(50),
        photoUrl:
          'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=800&auto=format&fit=crop&q=80',
        status: DonationStatus.PENDING,
      },
    });

    // (5) TRK-2026-DEMO01: Mã tra cứu mẫu trong tài liệu BE
    await tx.donation.upsert({
      where: { trackingId: 'TRK-2026-DEMO01' },
      update: {
        batchId: batchRice.id,
        status: DonationStatus.IN_BATCH,
        receivedQuantity: new Prisma.Decimal(200),
      },
      create: {
        id: ids.donTrkDemo,
        trackingId: 'TRK-2026-DEMO01',
        donorId: feUser.id,
        eventId: ids.eventPublished,
        donationNeedId: needRice.id,
        itemTypeId: itemRice.id,
        unitId: unitKg.id,
        quantity: new Prisma.Decimal(200),
        receivedQuantity: new Prisma.Decimal(200),
        status: DonationStatus.IN_BATCH,
        batchId: batchRice.id,
        receivedById: feOrganizer.id,
        receivedAt: new Date('2026-11-03T10:00:00+07:00'),
      },
    });

    // 11. Chuyến xe cứu trợ (Trip)
    const trip = await tx.trip.upsert({
      where: { id: ids.trip1 },
      update: { status: TripStatus.IN_TRANSIT },
      create: {
        id: ids.trip1,
        tripCode: 'TRP-2026-DEMO01',
        eventId: ids.eventPublished,
        createdById: feOrganizer.id,
        departurePoint: 'Kho cứu trợ Trung tâm Đà Nẵng',
        departureDate: new Date('2026-11-05T08:00:00+07:00'),
        vehicle: 'Xe tải 2.5 tấn - 43C-123.45',
        status: TripStatus.IN_TRANSIT,
      },
    });

    // Gán Lô hàng vào chuyến xe
    const tripBatchRice = await tx.tripBatch.upsert({
      where: {
        tripId_batchId: { tripId: trip.id, batchId: batchRice.id },
      },
      update: {},
      create: {
        id: ids.tripBatchRice,
        tripId: trip.id,
        batchId: batchRice.id,
        eventId: ids.eventPublished,
      },
    });

    await tx.tripBatch.upsert({
      where: {
        tripId_batchId: { tripId: trip.id, batchId: batchWater.id },
      },
      update: {},
      create: {
        id: ids.tripBatchWater,
        tripId: trip.id,
        batchId: batchWater.id,
        eventId: ids.eventPublished,
      },
    });

    // Gán Nhân sự vào chuyến xe (cả user@openaid.demo và leader@example.test làm LEADER)
    await tx.tripVolunteer.upsert({
      where: {
        tripId_applicationId: { tripId: trip.id, applicationId: appFeUser.id },
      },
      update: { role: TripVolunteerRole.LEADER },
      create: {
        id: ids.tripVolFeLeader,
        tripId: trip.id,
        applicationId: appFeUser.id,
        eventId: ids.eventPublished,
        role: TripVolunteerRole.LEADER,
      },
    });

    await tx.tripVolunteer.upsert({
      where: {
        tripId_applicationId: { tripId: trip.id, applicationId: appFeVolB.id },
      },
      update: { role: TripVolunteerRole.MEMBER },
      create: {
        id: ids.tripVolFeMember,
        tripId: trip.id,
        applicationId: appFeVolB.id,
        eventId: ids.eventPublished,
        role: TripVolunteerRole.MEMBER,
      },
    });

    await tx.tripVolunteer.upsert({
      where: {
        tripId_applicationId: { tripId: trip.id, applicationId: appLeader.id },
      },
      update: { role: TripVolunteerRole.LEADER },
      create: {
        id: ids.tripVolBeLeader,
        tripId: trip.id,
        applicationId: appLeader.id,
        eventId: ids.eventPublished,
        role: TripVolunteerRole.LEADER,
      },
    });

    // 12. Điểm phân phối (Points)
    const point1 = await tx.distributionPoint.upsert({
      where: { id: ids.point1 },
      update: { status: DistributionPointStatus.DISTRIBUTED },
      create: {
        id: ids.point1,
        tripId: trip.id,
        position: 1,
        name: 'UBND Xã Hòa Nhơn',
        location: 'Xã Hòa Nhơn, Huyện Hòa Vang, TP Đà Nẵng',
        mapUrl: 'https://maps.google.com/?q=Hoa+Nhon+Da+Nang',
        status: DistributionPointStatus.DISTRIBUTED,
        arrivedAt: new Date('2026-11-05T09:30:00+07:00'),
        distributedAt: new Date('2026-11-05T11:00:00+07:00'),
      },
    });

    const point2 = await tx.distributionPoint.upsert({
      where: { id: ids.point2 },
      update: { status: DistributionPointStatus.ARRIVED },
      create: {
        id: ids.point2,
        tripId: trip.id,
        position: 2,
        name: 'Trường Tiểu học Hòa Phong Số 1',
        location: 'Xã Hòa Phong, Huyện Hòa Vang, TP Đà Nẵng',
        mapUrl: 'https://maps.google.com/?q=Hoa+Phong+Da+Nang',
        status: DistributionPointStatus.ARRIVED,
        arrivedAt: new Date('2026-11-05T13:30:00+07:00'),
      },
    });

    // 13. Biên bản phát quà tại Điểm 1
    const record1 = await tx.distributionRecord.upsert({
      where: { id: ids.record1 },
      update: {},
      create: {
        id: ids.record1,
        tripId: trip.id,
        tripBatchId: tripBatchRice.id,
        distributionPointId: point1.id,
        distributedQuantity: new Prisma.Decimal(100),
        beneficiaryCount: 50,
        notes:
          'Cấp phát trực tiếp 100kg gạo cứu trợ cho 50 hộ dân ngập sâu tại xã Hòa Nhơn',
        confirmedById: feUser.id,
        confirmedAt: new Date('2026-11-05T11:00:00+07:00'),
      },
    });

    // 14. Bằng chứng trao quà (1 APPROVED + 1 PENDING để Organizer demo duyệt)
    await tx.evidence.upsert({
      where: { id: ids.evidenceApproved },
      update: { reviewStatus: EvidenceReviewStatus.APPROVED },
      create: {
        id: ids.evidenceApproved,
        tripId: trip.id,
        distributionPointId: point1.id,
        distributionRecordId: record1.id,
        uploadedById: feUser.id,
        imageUrl:
          'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80',
        mimeType: 'image/jpeg',
        sizeBytes: 154200,
        caption:
          'Hình ảnh trao quà gạo cứu trợ cho đại diện các hộ gia đình xã Hòa Nhơn',
        privacyConfirmed: true,
        reviewStatus: EvidenceReviewStatus.APPROVED,
        reviewedById: feOrganizer.id,
        reviewedAt: new Date('2026-11-05T12:00:00+07:00'),
      },
    });

    await tx.evidence.upsert({
      where: { id: ids.evidencePending },
      update: { reviewStatus: EvidenceReviewStatus.PENDING },
      create: {
        id: ids.evidencePending,
        tripId: trip.id,
        distributionPointId: point2.id,
        uploadedById: feUser.id,
        imageUrl:
          'https://images.unsplash.com/photo-1593113598332-cd288d649433?w=800&auto=format&fit=crop&q=80',
        mimeType: 'image/jpeg',
        sizeBytes: 182400,
        caption:
          'Ảnh tập kết nhu yếu phẩm tại điểm Trường Tiểu học Hòa Phong chờ Ban tổ chức kiểm duyệt',
        privacyConfirmed: true,
        reviewStatus: EvidenceReviewStatus.PENDING,
      },
    });

    // 15. Nhật ký minh bạch (Transparency Logs)
    await tx.transparencyLog.upsert({
      where: { id: '99000000-0000-4000-8000-000000000001' },
      update: {},
      create: {
        id: '99000000-0000-4000-8000-000000000001',
        eventId: ids.eventPublished,
        actorId: feOrganizer.id,
        action: 'EVENT_STATUS_CHANGED',
        entityType: TransparencyEntityType.EVENT,
        entityId: ids.eventPublished,
        oldStatus: EventStatus.DRAFT,
        newStatus: EventStatus.PUBLISHED,
        isPublic: true,
      },
    });

    await tx.transparencyLog.upsert({
      where: { id: '99000000-0000-4000-8000-000000000002' },
      update: {},
      create: {
        id: '99000000-0000-4000-8000-000000000002',
        eventId: ids.eventPublished,
        actorId: feUser.id,
        action: 'DISTRIBUTION_RECORDED',
        entityType: TransparencyEntityType.DISTRIBUTION_RECORD,
        entityId: record1.id,
        newStatus: DistributionPointStatus.DISTRIBUTED,
        evidenceId: ids.evidenceApproved,
        isPublic: true,
      },
    });
  });

  console.log('✅ Full End-to-End Demo Seed Completed Successfully!');
  console.log('------------------------------------------------------');
  console.log('Bộ tài khoản 1-Click trên Frontend (Mật khẩu: 123456):');
  console.log('1. Admin:        admin@openaid.demo');
  console.log('2. Organizer:    organizer@openaid.demo');
  console.log('3. User/Leader:  user@openaid.demo');
  console.log('4. Volunteer B:  volunteer.b@openaid.demo');
  console.log('------------------------------------------------------');
  console.log('Mã vận đơn mẫu tra cứu công khai (/track):');
  console.log('- DON-2026-7K3Q9X (Đã trao tặng + có ảnh bằng chứng)');
  console.log('- DON-2026-5W9K2N (Đang trên chuyến xe)');
  console.log('- DON-2026-3H6V8B (Đã nhập kho trung tâm)');
  console.log('- DON-2026-2F7J9K (Mới cam kết - chờ nhập kho)');
  console.log('- TRK-2026-DEMO01 (Mã demo BE)');
  console.log('------------------------------------------------------');
}

main()
  .catch((error) => {
    console.error('❌ Lỗi khi chạy seed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
