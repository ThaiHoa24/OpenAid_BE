import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class DonationsRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findNeedWithEvent(donationNeedId: string) {
    return this.prisma.donationNeed.findUnique({
      where: { id: donationNeedId },
      include: {
        event: true,
        itemType: true,
        unit: true,
      },
    });
  }

  async create(
    data: Prisma.DonationUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.donation.create({
      data,
      include: {
        itemType: true,
        unit: true,
        event: {
          select: {
            id: true,
            title: true,
            status: true,
            organizationId: true,
          },
        },
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.donation.findUnique({
      where: { id },
      include: {
        event: true,
        itemType: true,
        unit: true,
        donor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        batch: true,
      },
    });
  }

  async findByTrackingId(trackingId: string) {
    return this.prisma.donation.findUnique({
      where: { trackingId },
      include: {
        event: {
          include: {
            organization: true,
          },
        },
        itemType: true,
        unit: true,
        batch: {
          include: {
            assignments: {
              include: {
                trip: {
                  include: {
                    points: {
                      orderBy: { position: 'asc' },
                      include: {
                        records: {
                          include: {
                            evidence: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });
  }

  async findMyDonations(donorId: string, skip = 0, take = 20) {
    const [items, total] = await Promise.all([
      this.prisma.donation.findMany({
        where: { donorId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            select: {
              id: true,
              title: true,
              location: true,
              status: true,
            },
          },
          itemType: true,
          unit: true,
          batch: true,
        },
      }),
      this.prisma.donation.count({ where: { donorId } }),
    ]);

    return { items, total, skip, take };
  }

  async findEventDonations(eventId: string, skip = 0, take = 20) {
    const [items, total] = await Promise.all([
      this.prisma.donation.findMany({
        where: { eventId },
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          donor: {
            select: {
              id: true,
              fullName: true,
              email: true,
              phoneNumber: true,
            },
          },
          itemType: true,
          unit: true,
          batch: true,
        },
      }),
      this.prisma.donation.count({ where: { eventId } }),
    ]);

    return { items, total, skip, take };
  }

  async update(
    id: string,
    data: Prisma.DonationUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.donation.update({
      where: { id },
      data,
      include: {
        itemType: true,
        unit: true,
      },
    });
  }

  async upsertInventoryReceived(
    eventId: string,
    itemTypeId: string,
    unitId: string,
    quantity: Prisma.Decimal,
    tx: Prisma.TransactionClient,
  ) {
    const existing = await tx.inventory.findUnique({
      where: {
        eventId_itemTypeId_unitId: {
          eventId,
          itemTypeId,
          unitId,
        },
      },
    });

    if (existing) {
      return tx.inventory.update({
        where: { id: existing.id },
        data: {
          receivedQuantity: { increment: quantity },
          availableQuantity: { increment: quantity },
        },
      });
    }

    return tx.inventory.create({
      data: {
        eventId,
        itemTypeId,
        unitId,
        receivedQuantity: quantity,
        availableQuantity: quantity,
        reservedQuantity: new Prisma.Decimal(0),
        distributedQuantity: new Prisma.Decimal(0),
        lostQuantity: new Prisma.Decimal(0),
      },
    });
  }
}
