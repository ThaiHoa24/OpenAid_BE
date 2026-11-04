import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

export const EVENT_DETAIL_INCLUDE = {
  organization: {
    select: {
      id: true,
      name: true,
      code: true,
      description: true,
      email: true,
      phoneNumber: true,
      address: true,
      status: true,
    },
  },
  volunteerRoles: {
    select: {
      id: true,
      name: true,
      description: true,
      quantity: true,
      createdAt: true,
      updatedAt: true,
    },
  },
  donationNeeds: {
    select: {
      id: true,
      itemTypeId: true,
      unitId: true,
      targetQuantity: true,
      notes: true,
      createdAt: true,
      updatedAt: true,
      itemType: {
        select: {
          id: true,
          code: true,
          name: true,
          category: true,
          isActive: true,
        },
      },
      unit: {
        select: {
          id: true,
          code: true,
          name: true,
          isActive: true,
        },
      },
    },
  },
} as const;

/**
 * Data-access boundary for events, volunteer roles, and donation needs.
 * Scoped queries and transaction-aware writes.
 */
@Injectable()
export class EventsRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.event.findUnique({
      where: { id },
      include: EVENT_DETAIL_INCLUDE,
    });
  }

  async findMany(
    params: {
      skip?: number;
      take?: number;
      where?: Prisma.EventWhereInput;
      orderBy?: Prisma.EventOrderByWithRelationInput;
    },
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.event.findMany({
      skip: params.skip,
      take: params.take,
      where: params.where,
      orderBy: params.orderBy ?? { startDate: 'asc' },
      include: EVENT_DETAIL_INCLUDE,
    });
  }

  async count(where?: Prisma.EventWhereInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.event.count({ where });
  }

  async create(data: Prisma.EventCreateInput, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.event.create({
      data,
      include: EVENT_DETAIL_INCLUDE,
    });
  }

  async update(
    id: string,
    data: Prisma.EventUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.event.update({
      where: { id },
      data,
      include: EVENT_DETAIL_INCLUDE,
    });
  }

  async delete(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.event.delete({
      where: { id },
    });
  }

  async deleteVolunteerRoles(eventId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.volunteerRole.deleteMany({
      where: { eventId },
    });
  }

  async deleteDonationNeeds(eventId: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.donationNeed.deleteMany({
      where: { eventId },
    });
  }

  async validateItemTypes(ids: string[], tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.itemType.findMany({
      where: {
        id: { in: ids },
        isActive: true,
      },
      select: { id: true },
    });
  }

  async validateUnits(ids: string[], tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.unit.findMany({
      where: {
        id: { in: ids },
        isActive: true,
      },
      select: { id: true },
    });
  }

  async findActiveItemTypes(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.itemType.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findActiveUnits(tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.unit.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    });
  }

  async findDonationNeedsByEventId(
    eventId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.donationNeed.findMany({
      where: { eventId },
      include: {
        itemType: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            isActive: true,
          },
        },
        unit: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findDonationNeedById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.donationNeed.findUnique({
      where: { id },
      include: {
        itemType: true,
        unit: true,
        event: true,
      },
    });
  }

  async createDonationNeed(
    data: Prisma.DonationNeedUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.donationNeed.create({
      data,
      include: {
        itemType: {
          select: {
            id: true,
            code: true,
            name: true,
            category: true,
            isActive: true,
          },
        },
        unit: {
          select: {
            id: true,
            code: true,
            name: true,
            isActive: true,
          },
        },
      },
    });
  }

  async deleteDonationNeed(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.donationNeed.delete({
      where: { id },
    });
  }
}
