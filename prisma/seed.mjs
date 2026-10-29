import {
  PrismaClient,
  SystemRole,
  OrganizationRole,
  OrgStatus,
  EventStatus,
} from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

// Stable synthetic IDs make this foundation seed safe to run repeatedly.
const ids = {
  admin: '10000000-0000-4000-8000-000000000001',
  organizer: '10000000-0000-4000-8000-000000000002',
  organization: '20000000-0000-4000-8000-000000000001',
  event: '30000000-0000-4000-8000-000000000001',
  role: '40000000-0000-4000-8000-000000000001',
  rice: '50000000-0000-4000-8000-000000000001',
  water: '50000000-0000-4000-8000-000000000002',
  kg: '60000000-0000-4000-8000-000000000001',
  bottle: '60000000-0000-4000-8000-000000000002',
};

async function main() {
  const passwordHash = await bcrypt.hash('OpenAidDemo123!', 10);
  await prisma.$transaction(async (tx) => {
    for (const [id, email, fullName, systemRole] of [
      [ids.admin, 'admin@example.test', 'Demo Admin', SystemRole.ADMIN],
      [
        ids.organizer,
        'organizer@example.test',
        'Demo Organizer',
        SystemRole.USER,
      ],
    ]) {
      await tx.user.upsert({
        where: { email },
        update: {},
        create: { id, email, fullName, passwordHash, systemRole },
      });
    }

    const admin = await tx.user.findUniqueOrThrow({
      where: { email: 'admin@example.test' },
    });
    const organizer = await tx.user.findUniqueOrThrow({
      where: { email: 'organizer@example.test' },
    });
    const organization = await tx.organization.upsert({
      where: { code: 'OPENAID-DEMO' },
      update: {},
      create: {
        id: ids.organization,
        createdById: organizer.id,
        code: 'OPENAID-DEMO',
        name: 'OpenAid Demo Organization',
        email: 'contact@example.test',
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
      update: {},
      create: {
        userId: organizer.id,
        organizationId: organization.id,
        role: OrganizationRole.ORGANIZER,
      },
    });

    for (const [id, code, name] of [
      [ids.kg, 'KG', 'Kilogram'],
      [ids.bottle, 'BOTTLE', 'Bottle'],
    ]) {
      await tx.unit.upsert({
        where: { code },
        update: {},
        create: { id, code, name },
      });
    }
    for (const [id, code, name, category] of [
      [ids.rice, 'RICE', 'Rice', 'Food'],
      [ids.water, 'WATER', 'Drinking water', 'Beverages'],
    ]) {
      await tx.itemType.upsert({
        where: { code },
        update: {},
        create: { id, code, name, category },
      });
    }

    await tx.event.upsert({
      where: { id: ids.event },
      update: {},
      create: {
        id: ids.event,
        organizationId: organization.id,
        title: 'Ho tro khu vuc lu Hoa Vang',
        createdById: organizer.id,
        description:
          'Synthetic foundation data; end-to-end demo will be added with the use cases.',
        location: 'Hoa Vang, Da Nang',
        contactName: 'Demo Organizer',
        startDate: new Date('2026-11-01T08:00:00+07:00'),
        status: EventStatus.DRAFT,
      },
    });
    await tx.volunteerRole.upsert({
      where: { id: ids.role },
      update: {},
      create: {
        id: ids.role,
        eventId: ids.event,
        name: 'Transportation',
        quantity: 20,
      },
    });
    for (const [itemCode, unitCode, targetQuantity] of [
      ['RICE', 'KG', '500'],
      ['WATER', 'BOTTLE', '1000'],
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
        update: {},
        create: {
          eventId: ids.event,
          itemTypeId: item.id,
          unitId: unit.id,
          targetQuantity,
        },
      });
    }
  });
  console.log('Foundation seed completed. Demo accounts use OpenAidDemo123!');
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
