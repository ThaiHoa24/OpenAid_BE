import { Injectable, NotFoundException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';

@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationAccessService: OrganizationAccessService,
  ) {}

  async getOverviewStats(actor: AuthenticatedUser, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        organization: true,
        volunteerRoles: true,
        donationNeeds: {
          include: {
            itemType: true,
            unit: true,
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        eventId,
      );
    }

    const [
      donationsCount,
      batchesCount,
      tripsCount,
      applicationsCount,
      inventories,
    ] = await Promise.all([
      this.prisma.donation.count({ where: { eventId } }),
      this.prisma.batch.count({ where: { eventId } }),
      this.prisma.trip.count({ where: { eventId } }),
      this.prisma.volunteerApplication.count({ where: { eventId } }),
      this.prisma.inventory.findMany({
        where: { eventId },
        include: {
          itemType: true,
          unit: true,
        },
      }),
    ]);

    const inventorySummary = inventories.map((inv) => ({
      itemType: inv.itemType.name,
      unit: inv.unit.name,
      received: inv.receivedQuantity.toNumber(),
      available: inv.availableQuantity.toNumber(),
      reserved: inv.reservedQuantity.toNumber(),
      distributed: inv.distributedQuantity.toNumber(),
      lost: inv.lostQuantity.toNumber(),
    }));

    return {
      eventId: event.id,
      eventTitle: event.title,
      eventStatus: event.status,
      organizationName: event.organization.name,
      stats: {
        donationsCount,
        batchesCount,
        tripsCount,
        applicationsCount,
      },
      donationNeeds: event.donationNeeds.map((dn) => ({
        id: dn.id,
        itemType: dn.itemType.name,
        unit: dn.unit.name,
        targetQuantity: dn.targetQuantity.toNumber(),
      })),
      volunteerRoles: event.volunteerRoles.map((vr) => ({
        id: vr.id,
        name: vr.name,
        quantity: vr.quantity,
      })),
      inventorySummary,
    };
  }
}
