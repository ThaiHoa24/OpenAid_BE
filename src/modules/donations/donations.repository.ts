import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

export const DONATION_DETAIL_INCLUDE = {
  event: {
    select: {
      id: true,
      title: true,
      location: true,
      startDate: true,
      status: true,
      organizationId: true,
      organization: {
        select: {
          id: true,
          name: true,
          code: true,
        },
      },
    },
  },
  itemType: {
    select: {
      id: true,
      code: true,
      name: true,
      category: true,
    },
  },
  unit: {
    select: {
      id: true,
      code: true,
      name: true,
    },
  },
  batch: {
    select: {
      id: true,
      batchCode: true,
      status: true,
    },
  },
} as const;

/**
 * Data-access boundary for donations.
 * Scoped queries and transaction-aware writes.
 */
@Injectable()
export class DonationsRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.donation.findUnique({
      where: { id },
      include: DONATION_DETAIL_INCLUDE,
    });
  }

  async findByTrackingId(trackingId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.donation.findUnique({
      where: { trackingId },
      include: DONATION_DETAIL_INCLUDE,
    });
  }

  async findByDonorId(
    donorId: string,
    params: { skip?: number; take?: number },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.donation.findMany({
      where: { donorId },
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      include: DONATION_DETAIL_INCLUDE,
    });
  }

  async countByDonorId(donorId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.donation.count({
      where: { donorId },
    });
  }

  async create(
    data: Prisma.DonationUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.donation.create({
      data,
      include: DONATION_DETAIL_INCLUDE,
    });
  }

  async update(
    id: string,
    data: Prisma.DonationUpdateInput | Prisma.DonationUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.donation.update({
      where: { id },
      data,
      include: DONATION_DETAIL_INCLUDE,
    });
  }

  async findDonationNeed(
    donationNeedId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.donationNeed.findUnique({
      where: { id: donationNeedId },
      include: {
        event: true,
        itemType: true,
        unit: true,
      },
    });
  }

  async findDonationNeedByComposite(
    eventId: string,
    itemTypeId: string,
    unitId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.donationNeed.findUnique({
      where: {
        eventId_itemTypeId_unitId: {
          eventId,
          itemTypeId,
          unitId,
        },
      },
      include: {
        event: true,
        itemType: true,
        unit: true,
      },
    });
  }

  async findInventory(
    eventId: string,
    itemTypeId: string,
    unitId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.inventory.findUnique({
      where: {
        eventId_itemTypeId_unitId: {
          eventId,
          itemTypeId,
          unitId,
        },
      },
    });
  }

  async upsertInventory(
    data: {
      eventId: string;
      itemTypeId: string;
      unitId: string;
      quantity: Prisma.Decimal;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.inventory.upsert({
      where: {
        eventId_itemTypeId_unitId: {
          eventId: data.eventId,
          itemTypeId: data.itemTypeId,
          unitId: data.unitId,
        },
      },
      create: {
        eventId: data.eventId,
        itemTypeId: data.itemTypeId,
        unitId: data.unitId,
        receivedQuantity: data.quantity,
        availableQuantity: data.quantity,
        reservedQuantity: new Prisma.Decimal(0),
        distributedQuantity: new Prisma.Decimal(0),
        lostQuantity: new Prisma.Decimal(0),
      },
      update: {
        receivedQuantity: { increment: data.quantity },
        availableQuantity: { increment: data.quantity },
      },
    });
  }
}
