import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class InventoryRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findByOrganization(
    organizationId: string,
    eventId?: string,
    itemTypeId?: string,
  ) {
    return this.prisma.inventory.findMany({
      where: {
        event: {
          organizationId,
          ...(eventId ? { id: eventId } : {}),
        },
        ...(itemTypeId ? { itemTypeId } : {}),
      },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        itemType: true,
        unit: true,
      },
      orderBy: { updatedAt: 'desc' },
    });
  }
}
