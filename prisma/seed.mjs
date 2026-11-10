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
  admin: '10000000-0000-4000-8000-000000000001',
  organizer: '10000000-0000-4000-8000-000000000002',
  donor: '10000000-0000-4000-8000-000000000003',
  leader: '10000000-0000-4000-8000-000000000004',
  volunteer: '10000000-0000-4000-8000-000000000005',

  organization: '20000000-0000-4000-8000-000000000001',
  event: '30000000-0000-4000-8000-000000000001',

  roleLeader: '40000000-0000-4000-8000-000000000001',
  roleMember: '40000000-0000-4000-8000-000000000002',

  appLeader: '45000000-0000-4000-8000-000000000001',
  appMember: '45000000-0000-4000-8000-000000000002',

  rice: '50000000-0000-4000-8000-000000000001',
  water: '50000000-0000-4000-8000-000000000002',
  noodles: '50000000-0000-4000-8000-000000000003',

  kg: '60000000-0000-4000-8000-000000000001',
  bottle: '60000000-0000-4000-8000-000000000002',
  box: '60000000-0000-4000-8000-000000000003',

  donation1: '70000000-0000-4000-8000-000000000001',
  donation2: '70000000-0000-4000-8000-000000000002',
  donation3: '70000000-0000-4000-8000-000000000003',

  inventoryRice: '75000000-0000-4000-8000-000000000001',
  inventoryWater: '75000000-0000-4000-8000-000000000002',

  batch1: '80000000-0000-4000-8000-000000000001',

  trip1: '90000000-0000-4000-8000-000000000001',
  tripBatch1: '91000000-0000-4000-8000-000000000001',
  tripVolLeader: '92000000-0000-4000-8000-000000000001',
  tripVolMember: '92000000-0000-4000-8000-000000000002',

  point1: '95000000-0000-4000-8000-000000000001',
  point2: '95000000-0000-4000-8000-000000000002',

  record1: '96000000-0000-4000-8000-000000000001',
  evidence1: '97000000-0000-4000-8000-000000000001',
};

async function main() {
  const passwordHash = await bcrypt.hash('OpenAidDemo123!', 10);

  await prisma.$transaction(async (tx) => {
    // 1. Tạo Users
    const usersData = [
      [ids.admin, 'admin@example.test', 'Demo Admin', SystemRole.ADMIN],
      [
        ids.organizer,
        'organizer@example.test',
        'Demo Organizer',
        SystemRole.USER,
      ],
      [ids.donor, 'donor@example.test', 'Nhà hảo tâm Demo', SystemRole.USER],
      [
        ids.leader,
        'leader@example.test',
        'Đội trưởng Chuyến xe',
        SystemRole.USER,
      ],
      [
        ids.volunteer,
        'volunteer@example.test',
        'Tình nguyện viên Demo',
        SystemRole.USER,
      ],
    ];

    for (const [id, email, fullName, systemRole] of usersData) {
      await tx.user.upsert({
        where: { email },
        update: { fullName, passwordHash, systemRole },
        create: { id, email, fullName, passwordHash, systemRole },
      });
    }

    const admin = await tx.user.findUniqueOrThrow({
      where: { email: 'admin@example.test' },
    });
    const organizer = await tx.user.findUniqueOrThrow({
      where: { email: 'organizer@example.test' },
    });
    const donor = await tx.user.findUniqueOrThrow({
      where: { email: 'donor@example.test' },
    });
    const leader = await tx.user.findUniqueOrThrow({
      where: { email: 'leader@example.test' },
    });
    const volunteer = await tx.user.findUniqueOrThrow({
      where: { email: 'volunteer@example.test' },
    });

    // 2. Tạo Tổ chức
    const organization = await tx.organization.upsert({
      where: { code: 'OPENAID-DEMO' },
      update: { status: OrgStatus.APPROVED },
      create: {
        id: ids.organization,
        createdById: organizer.id,
        code: 'OPENAID-DEMO',
        name: 'Hội Cứu Trợ & Bác Ái OpenAid',
        email: 'contact@openaid.test',
        description: 'Tổ chức thiện nguyện điều phối cứu trợ khẩn cấp',
        status: OrgStatus.APPROVED,
        reviewedById: admin.id,
        reviewedAt: new Date(),
      },
    });

    await tx.organizationMember.upsert({
      where: {
        userId_organizationId: {
          userId: organizer.id,
          organizationId: organization.id,
        },
      },
      update: { role: OrganizationRole.ORGANIZER },
      create: {
        userId: organizer.id,
        organizationId: organization.id,
        role: OrganizationRole.ORGANIZER,
      },
    });

    // 3. Đơn vị tính & Loại hàng
    const units = [
      [ids.kg, 'KG', 'Kilogram'],
      [ids.bottle, 'BOTTLE', 'Chai'],
      [ids.box, 'BOX', 'Thùng'],
    ];
    for (const [id, code, name] of units) {
      await tx.unit.upsert({
        where: { code },
        update: { name },
        create: { id, code, name },
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
        update: { name, category },
        create: { id, code, name, category },
      });
    }

    // 4. Sự kiện cứu trợ đã công bố (PUBLISHED)
    await tx.event.upsert({
      where: { id: ids.event },
      update: { status: EventStatus.PUBLISHED },
      create: {
        id: ids.event,
        organizationId: organization.id,
        title: 'Cứu trợ khẩn cấp bà con vùng lũ Hòa Vang',
        createdById: organizer.id,
        description:
          'Chiến dịch tiếp nhận nhu yếu phẩm và điều phối trực tiếp tới các hộ dân cô lập tại Đà Nẵng.',
        location: 'Huyện Hòa Vang, TP Đà Nẵng',
        contactName: 'Phan Vĩnh Thái Hòa',
        contactPhone: '0905123456',
        startDate: new Date('2026-11-01T08:00:00+07:00'),
        endDate: new Date('2026-12-01T18:00:00+07:00'),
        publishedAt: new Date('2026-11-01T09:00:00+07:00'),
        status: EventStatus.PUBLISHED,
      },
    });

    // 5. Nhu cầu quyên góp (Donation Needs)
    for (const [itemCode, unitCode, targetQuantity] of [
      ['RICE', 'KG', '1000'],
      ['WATER', 'BOTTLE', '2000'],
      ['NOODLES', 'BOX', '500'],
    ]) {
      const item = await tx.itemType.findUniqueOrThrow({
        where: { code: itemCode },
      });
      const unit = await tx.unit.findUniqueOrThrow({
        where: { code: unitCode },
      });
      await tx.donationNeed.upsert({
        where: {
          eventId_itemTypeId_unitId: {
            eventId: ids.event,
            itemTypeId: item.id,
            unitId: unit.id,
          },
        },
        update: { targetQuantity: new Prisma.Decimal(targetQuantity) },
        create: {
          eventId: ids.event,
          itemTypeId: item.id,
          unitId: unit.id,
          targetQuantity: new Prisma.Decimal(targetQuantity),
        },
      });
    }

    // 6. Vai trò tình nguyện viên (Volunteer Roles)
    await tx.volunteerRole.upsert({
      where: { id: ids.roleLeader },
      update: { quantity: 2 },
      create: {
        id: ids.roleLeader,
        eventId: ids.event,
        name: 'Trưởng đoàn điều phối chuyến xe',
        description:
          'Phụ trách chuyến xe, dẫn đoàn và đối soát cấp phát tại các điểm đến',
        quantity: 2,
      },
    });

    await tx.volunteerRole.upsert({
      where: { id: ids.roleMember },
      update: { quantity: 15 },
      create: {
        id: ids.roleMember,
        eventId: ids.event,
        name: 'Tình nguyện viên bốc dỡ & phát quà',
        description: 'Hỗ trợ đóng gói, bốc dỡ và trao quà tận tay bà con',
        quantity: 15,
      },
    });

    // 7. Đơn ứng tuyển TNV (Applications & Attendance)
    await tx.volunteerApplication.upsert({
      where: { eventId_userId: { eventId: ids.event, userId: leader.id } },
      update: { status: VolunteerApplicationStatus.APPROVED },
      create: {
        id: ids.appLeader,
        eventId: ids.event,
        userId: leader.id,
        volunteerRoleId: ids.roleLeader,
        status: VolunteerApplicationStatus.APPROVED,
        reviewedById: organizer.id,
        reviewedAt: new Date(),
      },
    });

    await tx.volunteerApplication.upsert({
      where: { eventId_userId: { eventId: ids.event, userId: volunteer.id } },
      update: { status: VolunteerApplicationStatus.APPROVED },
      create: {
        id: ids.appMember,
        eventId: ids.event,
        userId: volunteer.id,
        volunteerRoleId: ids.roleMember,
        status: VolunteerApplicationStatus.APPROVED,
        reviewedById: organizer.id,
        reviewedAt: new Date(),
      },
    });

    // Điểm danh ca trực cho Leader
    await tx.volunteerAttendance.upsert({
      where: { id: '46000000-0000-4000-8000-000000000001' },
      update: {},
      create: {
        id: '46000000-0000-4000-8000-000000000001',
        applicationId: ids.appLeader,
        checkInTime: new Date('2026-11-05T07:30:00+07:00'),
        checkInConfirmedById: organizer.id,
      },
    });

    // 8. Tồn kho khởi tạo
    const invRice = await tx.inventory.upsert({
      where: {
        eventId_itemTypeId_unitId: {
          eventId: ids.event,
          itemTypeId: ids.rice,
          unitId: ids.kg,
        },
      },
      update: {},
      create: {
        id: ids.inventoryRice,
        eventId: ids.event,
        itemTypeId: ids.rice,
        unitId: ids.kg,
        receivedQuantity: new Prisma.Decimal(500),
        availableQuantity: new Prisma.Decimal(300),
        reservedQuantity: new Prisma.Decimal(200),
        distributedQuantity: new Prisma.Decimal(0),
        lostQuantity: new Prisma.Decimal(0),
      },
    });

    // 9. Lô hàng (Batch)
    const batch = await tx.batch.upsert({
      where: { id: ids.batch1 },
      update: { status: BatchStatus.ASSIGNED },
      create: {
        id: ids.batch1,
        batchCode: 'BAT-2026-DEMO01',
        eventId: ids.event,
        inventoryId: invRice.id,
        itemTypeId: ids.rice,
        unitId: ids.kg,
        quantity: new Prisma.Decimal(200),
        status: BatchStatus.ASSIGNED,
        createdById: organizer.id,
      },
    });

    // 10. Các khoản quyên góp (Donations)
    // Donation 1: Đã gom vào Lô hàng (IN_BATCH) - có mã tra cứu công khai!
    await tx.donation.upsert({
      where: { id: ids.donation1 },
      update: { batchId: batch.id, status: DonationStatus.IN_BATCH },
      create: {
        id: ids.donation1,
        trackingId: 'TRK-2026-DEMO01',
        donorId: donor.id,
        eventId: ids.event,
        itemTypeId: ids.rice,
        unitId: ids.kg,
        quantity: new Prisma.Decimal(200),
        status: DonationStatus.IN_BATCH,
        batchId: batch.id,
        donorName: 'Nhà hảo tâm Ẩn Danh',
        donorPhone: '0909999888',
        donorEmail: 'donor@example.test',
        receivedById: organizer.id,
        receivedAt: new Date('2026-11-03T10:00:00+07:00'),
      },
    });

    // Donation 2: Đã tiếp nhận vào kho (RECEIVED)
    await tx.donation.upsert({
      where: { id: ids.donation2 },
      update: { status: DonationStatus.RECEIVED },
      create: {
        id: ids.donation2,
        trackingId: 'TRK-2026-DEMO02',
        donorId: donor.id,
        eventId: ids.event,
        itemTypeId: ids.rice,
        unitId: ids.kg,
        quantity: new Prisma.Decimal(300),
        status: DonationStatus.RECEIVED,
        donorName: 'Nhà hảo tâm Demo',
        donorPhone: '0909999888',
        donorEmail: 'donor@example.test',
        receivedById: organizer.id,
        receivedAt: new Date('2026-11-04T14:00:00+07:00'),
      },
    });

    // Donation 3: Đang cam kết (PENDING)
    await tx.donation.upsert({
      where: { id: ids.donation3 },
      update: { status: DonationStatus.PENDING },
      create: {
        id: ids.donation3,
        trackingId: 'TRK-2026-DEMO03',
        donorId: donor.id,
        eventId: ids.event,
        itemTypeId: ids.water,
        unitId: ids.bottle,
        quantity: new Prisma.Decimal(500),
        status: DonationStatus.PENDING,
        donorName: 'Nhà hảo tâm Demo',
        donorPhone: '0909999888',
        donorEmail: 'donor@example.test',
      },
    });

    // 11. Chuyến xe cứu trợ (Trip)
    const trip = await tx.trip.upsert({
      where: { id: ids.trip1 },
      update: { status: TripStatus.IN_TRANSIT },
      create: {
        id: ids.trip1,
        tripCode: 'TRP-2026-DEMO01',
        eventId: ids.event,
        createdById: organizer.id,
        departurePoint: 'Kho cứu trợ Trung tâm Đà Nẵng',
        departureDate: new Date('2026-11-05T08:00:00+07:00'),
        vehicle: 'Xe tải 2.5 tấn - 43C-123.45',
        status: TripStatus.IN_TRANSIT,
      },
    });

    // Gán Lô hàng vào chuyến xe
    const tripBatch = await tx.tripBatch.upsert({
      where: { id: ids.tripBatch1 },
      update: {},
      create: {
        id: ids.tripBatch1,
        tripId: trip.id,
        batchId: batch.id,
        eventId: ids.event,
      },
    });

    // Gán Nhân sự vào chuyến xe
    await tx.tripVolunteer.upsert({
      where: {
        tripId_applicationId: { tripId: trip.id, applicationId: ids.appLeader },
      },
      update: { role: TripVolunteerRole.LEADER },
      create: {
        id: ids.tripVolLeader,
        tripId: trip.id,
        applicationId: ids.appLeader,
        eventId: ids.event,
        role: TripVolunteerRole.LEADER,
      },
    });

    await tx.tripVolunteer.upsert({
      where: {
        tripId_applicationId: { tripId: trip.id, applicationId: ids.appMember },
      },
      update: { role: TripVolunteerRole.MEMBER },
      create: {
        id: ids.tripVolMember,
        tripId: trip.id,
        applicationId: ids.appMember,
        eventId: ids.event,
        role: TripVolunteerRole.MEMBER,
      },
    });

    // Điểm phân phối (Points)
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

    await tx.distributionPoint.upsert({
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

    // Biên bản phát quà tại Điểm 1
    const record1 = await tx.distributionRecord.upsert({
      where: { id: ids.record1 },
      update: {},
      create: {
        id: ids.record1,
        tripId: trip.id,
        tripBatchId: tripBatch.id,
        distributionPointId: point1.id,
        distributedQuantity: new Prisma.Decimal(100),
        beneficiaryCount: 50,
        notes: 'Cấp phát trực tiếp 100 bao gạo cứu trợ cho 50 hộ dân ngập sâu',
        confirmedById: leader.id,
        confirmedAt: new Date('2026-11-05T11:00:00+07:00'),
      },
    });

    // Bằng chứng trao quà (Evidence) đã được Organizer duyệt
    await tx.evidence.upsert({
      where: { id: ids.evidence1 },
      update: { reviewStatus: EvidenceReviewStatus.APPROVED },
      create: {
        id: ids.evidence1,
        tripId: trip.id,
        distributionPointId: point1.id,
        distributionRecordId: record1.id,
        uploadedById: leader.id,
        imageUrl:
          'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80',
        mimeType: 'image/jpeg',
        sizeBytes: 154200,
        caption:
          'Hình ảnh trao quà gạo cứu trợ cho đại diện các hộ gia đình xã Hòa Nhơn',
        privacyConfirmed: true,
        reviewStatus: EvidenceReviewStatus.APPROVED,
        reviewedById: organizer.id,
        reviewedAt: new Date('2026-11-05T12:00:00+07:00'),
      },
    });

    // Nhật ký minh bạch (Transparency Log)
    await tx.transparencyLog.upsert({
      where: { id: '99000000-0000-4000-8000-000000000001' },
      update: {},
      create: {
        id: '99000000-0000-4000-8000-000000000001',
        eventId: ids.event,
        actorId: organizer.id,
        action: 'EVENT_PUBLISHED',
        entityType: TransparencyEntityType.EVENT,
        entityId: ids.event,
        newStatus: EventStatus.PUBLISHED,
        isPublic: true,
      },
    });

    await tx.transparencyLog.upsert({
      where: { id: '99000000-0000-4000-8000-000000000002' },
      update: {},
      create: {
        id: '99000000-0000-4000-8000-000000000002',
        eventId: ids.event,
        actorId: leader.id,
        action: 'DISTRIBUTION_RECORDED',
        entityType: TransparencyEntityType.DISTRIBUTION_RECORD,
        entityId: record1.id,
        newStatus: DistributionPointStatus.DISTRIBUTED,
        isPublic: true,
      },
    });
  });

  console.log('✅ Full End-to-End Demo Seed Completed Successfully!');
  console.log('------------------------------------------------------');
  console.log('Tài khoản dùng chung mật khẩu: OpenAidDemo123!');
  console.log('1. Admin:        admin@example.test');
  console.log('2. Organizer:    organizer@example.test');
  console.log('3. Donor:        donor@example.test');
  console.log('4. Trip Leader:  leader@example.test');
  console.log('5. Volunteer:    volunteer@example.test');
  console.log('Mã tra cứu công khai (Tracking ID): TRK-2026-DEMO01');
  console.log('------------------------------------------------------');
}

main()
  .catch((error) => {
    console.error('❌ Lỗi khi chạy seed:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
