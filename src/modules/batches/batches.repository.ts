import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class BatchesRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findDonationsByIds(ids: string[]) {
    return this.prisma.donation.findMany({
      where: { id: { in: ids } },
      include: {
        itemType: true,
        unit: true,
      },
    });
  }

  async findInventory(eventId: string, itemTypeId: string, unitId: string) {
    return this.prisma.inventory.findUnique({
      where: {
        eventId_itemTypeId_unitId: {
          eventId,
          itemTypeId,
          unitId,
        },
      },
    });
  }

  async create(
    data: Prisma.BatchUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.batch.create({
      data,
      include: {
        itemType: true,
        unit: true,
        donations: true,
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.batch.findUnique({
      where: { id },
      include: {
        itemType: true,
        unit: true,
        event: true,
        donations: true,
        assignments: {
          include: {
            trip: true,
          },
        },
      },
    });
  }

  async findByEvent(eventId: string) {
    return this.prisma.batch.findMany({
      where: { eventId },
      include: {
        itemType: true,
        unit: true,
        donations: true,
        assignments: {
          include: {
            trip: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    data: Prisma.BatchUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.batch.update({
      where: { id },
      data,
      include: {
        itemType: true,
        unit: true,
      },
    });
  }

  async reserveInventory(
    inventoryId: string,
    quantity: Prisma.Decimal,
    tx: Prisma.TransactionClient,
  ) {
    return tx.inventory.update({
      where: { id: inventoryId },
      data: {
        availableQuantity: { decrement: quantity },
        reservedQuantity: { increment: quantity },
      },
    });
  }

  async reconcileInventory(
    inventoryId: string,
    batchQuantity: Prisma.Decimal,
    returnedQuantity: Prisma.Decimal,
    lostQuantity: Prisma.Decimal,
    tx: Prisma.TransactionClient,
  ) {
    const distributed = batchQuantity
      .minus(returnedQuantity)
      .minus(lostQuantity);

    return tx.inventory.update({
      where: { id: inventoryId },
      data: {
        reservedQuantity: { decrement: batchQuantity },
        availableQuantity: { increment: returnedQuantity },
        distributedQuantity: { increment: distributed },
        lostQuantity: { increment: lostQuantity },
      },
    });
  }
}
