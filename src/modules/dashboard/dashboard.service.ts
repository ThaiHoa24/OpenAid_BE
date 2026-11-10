import { Injectable, NotFoundException } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import {
  DonationStatus,
  VolunteerApplicationStatus,
} from '../../common/enums/index.js';

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
      donations,
      applications,
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
      this.prisma.donation.findMany({
        where: { eventId },
        select: {
          itemTypeId: true,
          unitId: true,
          quantity: true,
          status: true,
        },
      }),
      this.prisma.volunteerApplication.findMany({
        where: { eventId },
        select: {
          volunteerRoleId: true,
          status: true,
        },
      }),
    ]);

    // Inventory summary
    const inventorySummary = inventories.map((inv) => ({
      itemTypeId: inv.itemTypeId,
      itemType: inv.itemType.name,
      unitId: inv.unitId,
      unit: inv.unit.name,
      received: inv.receivedQuantity.toNumber(),
      available: inv.availableQuantity.toNumber(),
      reserved: inv.reservedQuantity.toNumber(),
      distributed: inv.distributedQuantity.toNumber(),
      lost: inv.lostQuantity.toNumber(),
    }));

    // Needed vs Pledged vs Received vs Distributed comparison (OA-S5-05)
    let totalNeededQuantity = 0;
    let totalReceivedQuantity = 0;
    let totalDistributedQuantity = 0;

    const donationNeedsProgress = event.donationNeeds.map((dn) => {
      const target = dn.targetQuantity.toNumber();
      totalNeededQuantity += target;

      const matchingDonations = donations.filter(
        (d) => d.itemTypeId === dn.itemTypeId && d.unitId === dn.unitId,
      );

      const pledged = matchingDonations
        .filter((d) => d.status === DonationStatus.PENDING)
        .reduce((sum, d) => sum + d.quantity.toNumber(), 0);

      const inv = inventories.find(
        (i) => i.itemTypeId === dn.itemTypeId && i.unitId === dn.unitId,
      );

      const received = inv ? inv.receivedQuantity.toNumber() : 0;
      const available = inv ? inv.availableQuantity.toNumber() : 0;
      const reserved = inv ? inv.reservedQuantity.toNumber() : 0;
      const distributed = inv ? inv.distributedQuantity.toNumber() : 0;
      const lost = inv ? inv.lostQuantity.toNumber() : 0;

      totalReceivedQuantity += received;
      totalDistributedQuantity += distributed;

      const fulfillmentRate =
        target > 0
          ? Math.min(100, Number(((received / target) * 100).toFixed(1)))
          : 100;

      const distributionRate =
        target > 0
          ? Math.min(100, Number(((distributed / target) * 100).toFixed(1)))
          : 100;

      return {
        id: dn.id,
        itemTypeId: dn.itemTypeId,
        itemType: dn.itemType.name,
        unitId: dn.unitId,
        unit: dn.unit.name,
        targetQuantity: target,
        pledgedQuantity: pledged,
        receivedQuantity: received,
        availableQuantity: available,
        reservedQuantity: reserved,
        distributedQuantity: distributed,
        lostQuantity: lost,
        remainingNeeded: Math.max(0, target - received),
        fulfillmentRate,
        distributionRate,
      };
    });

    // Volunteer roles recruitment progress
    let totalVolunteerTarget = 0;
    let totalVolunteerApproved = 0;

    const volunteerRolesProgress = event.volunteerRoles.map((vr) => {
      totalVolunteerTarget += vr.quantity;
      const roleApps = applications.filter((a) => a.volunteerRoleId === vr.id);
      const approvedCount = roleApps.filter(
        (a) => a.status === VolunteerApplicationStatus.APPROVED,
      ).length;
      const pendingCount = roleApps.filter(
        (a) => a.status === VolunteerApplicationStatus.PENDING,
      ).length;
      const rejectedCount = roleApps.filter(
        (a) => a.status === VolunteerApplicationStatus.REJECTED,
      ).length;

      totalVolunteerApproved += approvedCount;

      const fulfillmentRate =
        vr.quantity > 0
          ? Math.min(
              100,
              Number(((approvedCount / vr.quantity) * 100).toFixed(1)),
            )
          : 100;

      return {
        id: vr.id,
        name: vr.name,
        targetQuantity: vr.quantity,
        approvedCount,
        pendingCount,
        rejectedCount,
        fulfillmentRate,
      };
    });

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
        totalNeededQuantity,
        totalReceivedQuantity,
        totalDistributedQuantity,
        totalVolunteerTarget,
        totalVolunteerApproved,
      },
      donationNeeds: donationNeedsProgress,
      volunteerRoles: volunteerRolesProgress,
      inventorySummary,
    };
  }
}
