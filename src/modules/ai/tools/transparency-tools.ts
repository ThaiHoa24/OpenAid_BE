/**
 * Function Calling Tools - Transparency (Minh bạch & Thống kê)
 */

import { Prisma, TransparencyEntityType } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.js';
import { OrganizationAccessService } from '../../organizations/organization-access.service.js';

export interface GetTransparencyStatsArgs {
  eventId?: string;
  organizationId?: string;
  userId?: string; // For user's own stats
}

export interface GetEntityTimelineArgs {
  entityType: string; // TransparencyEntityType
  entityId: string;
  isPublicOnly?: boolean; // default true for non-admin
}

export class TransparencyTools {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAccess: OrganizationAccessService,
  ) {}

  /**
   * Thống kê minh bạch
   * - Admin: toàn hệ thống hoặc lọc theo event/org
   * - Organizer: chỉ event/org của mình
   * - User: chỉ stats cá nhân (donations, volunteer hours)
   */
  async getTransparencyStats(args: GetTransparencyStatsArgs, actor: AuthenticatedUser | null): Promise<any> {
    // User stats (personal)
    if (!actor || (actor.systemRole === 'USER' && !args.eventId && !args.organizationId)) {
      if (!actor) throw new Error('Cần đăng nhập để xem thống kê cá nhân');
      return this.getPersonalStats(actor.id);
    }

    // Admin/Organizer stats
    if (actor.systemRole === 'ADMIN') {
      return this.getAdminStats(args.eventId, args.organizationId);
    }

    // Organizer: verify access
    if (args.eventId) {
      await this.orgAccess.requireEventOrganizer(actor.id, args.eventId);
      return this.getEventStats(args.eventId);
    }

    if (args.organizationId) {
      await this.orgAccess.requireOrganizer(actor.id, args.organizationId);
      return this.getOrgStats(args.organizationId);
    }

    // Organizer without specific filter: get their primary org stats
    const membership = await this.prisma.organizationMember.findFirst({
      where: { userId: actor.id, role: 'ORGANIZER' },
      select: { organizationId: true },
    });
    if (membership) {
      return this.getOrgStats(membership.organizationId);
    }

    throw new Error('Bạn không phải Organizer của tổ chức nào');
  }

  private async getPersonalStats(userId: string): Promise<any> {
    const [donations, volunteerApps] = await Promise.all([
      this.prisma.donation.aggregate({
        where: { donorId: userId, status: { notIn: ['CANCELLED', 'REJECTED'] } },
        _sum: { quantity: true, receivedQuantity: true },
        _count: true,
      }),
      this.prisma.volunteerApplication.findMany({
        where: { userId, status: 'APPROVED' },
        include: { attendance: true, event: { select: { title: true } } },
      }),
    ]);

    // Calculate volunteer hours
    let totalHours = 0;
    for (const a of volunteerApps) {
      if (a.attendance?.checkedInAt && a.attendance.checkedOutAt) {
        totalHours += (a.attendance.checkedOutAt.getTime() - a.attendance.checkedInAt.getTime()) / 3.6e6;
      }
    }

    return {
      type: 'personal',
      donations: {
        totalCount: donations._count,
        totalQuantityPledged: Number(donations._sum.quantity || 0),
        totalQuantityReceived: Number(donations._sum.receivedQuantity || 0),
      },
      volunteer: {
        totalEvents: volunteerApps.length,
        totalHours: Math.round(totalHours * 10) / 10,
        events: volunteerApps.map(a => ({
          eventTitle: a.event.title,
          hours: a.attendance?.checkedInAt && a.attendance.checkedOutAt
            ? Math.round(((a.attendance.checkedOutAt.getTime() - a.attendance.checkedInAt.getTime()) / 3.6e6) * 10) / 10
            : 0,
        })),
      },
    };
  }

  private async getAdminStats(eventId?: string, orgId?: string): Promise<any> {
    const eventWhere = eventId ? { id: eventId } : {};
    const orgWhere = orgId ? { id: orgId } : {};

    const [
      totalUsers, totalOrgs, totalEvents, totalDonations, totalVolunteers,
      totalBatches, totalTrips, totalDistributedQty, totalEvidences,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.organization.count(),
      this.prisma.event.count({ where: eventWhere }),
      this.prisma.donation.aggregate({ where: { ...(eventId ? { eventId } : {}), status: { notIn: ['CANCELLED', 'REJECTED'] } }, _sum: { quantity: true, receivedQuantity: true }, _count: true }),
      this.prisma.volunteerApplication.count({ where: { status: 'APPROVED', ...(eventId ? { eventId } : {}) } }),
      this.prisma.batch.count({ where: eventId ? { eventId } : {} }),
      this.prisma.trip.count({ where: eventId ? { eventId } : {} }),
      this.prisma.distributionRecord.aggregate({ where: eventId ? { trip: { eventId } } : {}, _sum: { distributedQuantity: true } }),
      this.prisma.evidence.count({ where: { reviewStatus: 'APPROVED', ...(eventId ? { trip: { eventId } } : {}) } }),
    ]);

    return {
      type: 'admin',
      overview: {
        totalUsers,
        totalOrganizations: totalOrgs,
        totalEvents,
        totalDonations: totalDonations._count,
        totalQuantityPledged: Number(totalDonations._sum.quantity || 0),
        totalQuantityReceived: Number(totalDonations._sum.receivedQuantity || 0),
        totalVolunteers,
        totalBatches,
        totalTrips,
        totalDistributedQuantity: Number(totalDistributedQty._sum.distributedQuantity || 0),
        totalEvidencesApproved: totalEvidences,
      },
      transparencyScore: this.calculateTransparencyScore(
        totalDonations._count,
        totalDistributedQty._sum.distributedQuantity ? 1 : 0,
        totalTrips,
        totalEvidences
      ),
    };
  }

  private async getEventStats(eventId: string): Promise<any> {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: {
        donationNeeds: {
          include: {
            itemType: true,
            unit: true,
            donations: { where: { status: { notIn: ['CANCELLED', 'REJECTED'] } } }
          }
        },
        volunteerRoles: { include: { _count: { select: { applications: { where: { status: 'APPROVED' } } } } } },
        batches: { include: { donations: true } },
        trips: { include: { points: { include: { records: true, evidence: { where: { reviewStatus: 'APPROVED', privacyConfirmed: true } } } } } },
      },
    });

    if (!event) throw new Error('Event not found');

    const totalTarget = event.donationNeeds.reduce((s, n) => s + Number(n.targetQuantity), 0);
    const totalReceived = event.donationNeeds.reduce((s, n) => s + n.donations.reduce((s2, d) => s2 + Number(d.receivedQuantity), 0), 0);
    const totalDonations = event.donationNeeds.reduce((s, n) => s + n.donations.length, 0);
    const totalVolunteers = event.volunteerRoles.reduce((s, r) => s + r._count.applications, 0);
    const totalBatches = event.batches.length;
    const totalTrips = event.trips.length;
    const totalDistributed = event.trips.reduce((s, t) => s + t.points.reduce((s2, p) => s2 + p.records.reduce((s3, r) => s3 + Number(r.distributedQuantity), 0), 0), 0);
    const totalEvidences = event.trips.reduce((s, t) => s + t.points.reduce((s2, p) => s2 + p.evidence.length, 0), 0);

    return {
      type: 'event',
      eventId,
      eventTitle: event.title,
      overview: {
        fillRatio: totalTarget > 0 ? totalReceived / totalTarget : 1,
        totalTargetQuantity: totalTarget,
        totalReceivedQuantity: totalReceived,
        totalDonations,
        totalVolunteers,
        totalBatches,
        totalTrips,
        totalDistributedQuantity: totalDistributed,
        totalEvidencesApproved: totalEvidences,
      },
      needs: event.donationNeeds.map(n => ({
        item: n.itemType.name,
        unit: n.unit.name,
        target: Number(n.targetQuantity),
        received: n.donations.reduce((s, d) => s + Number(d.receivedQuantity), 0),
      })),
      volunteerRoles: event.volunteerRoles.map(r => ({ name: r.name, required: r.quantity, approved: r._count.applications })),
    };
  }

  private async getOrgStats(organizationId: string): Promise<any> {
    const events = await this.prisma.event.findMany({
      where: { organizationId },
      include: {
        donationNeeds: { include: { donations: { where: { status: { notIn: ['CANCELLED', 'REJECTED'] } } } } },
        volunteerRoles: { include: { _count: { select: { applications: { where: { status: 'APPROVED' } } } } } },
        trips: { include: { points: { include: { records: true, evidence: { where: { reviewStatus: 'APPROVED', privacyConfirmed: true } } } } } },
      },
    });

    let totalTarget = 0, totalReceived = 0, totalDonations = 0, totalVolunteers = 0, totalTrips = 0, totalDistributed = 0, totalEvidences = 0;

    for (const e of events) {
      totalTarget += e.donationNeeds.reduce((s, n) => s + Number(n.targetQuantity), 0);
      totalReceived += e.donationNeeds.reduce((s, n) => s + n.donations.reduce((s2, d) => s2 + Number(d.receivedQuantity), 0), 0);
      totalDonations += e.donationNeeds.reduce((s, n) => s + n.donations.length, 0);
      totalVolunteers += e.volunteerRoles.reduce((s, r) => s + r._count.applications, 0);
      totalTrips += e.trips.length;
      totalDistributed += e.trips.reduce((s, t) => s + t.points.reduce((s2, p) => s2 + p.records.reduce((s3, r) => s3 + Number(r.distributedQuantity), 0), 0), 0);
      totalEvidences += e.trips.reduce((s, t) => s + t.points.reduce((s2, p) => s2 + p.evidence.length, 0), 0);
    }

    return {
      type: 'organization',
      organizationId,
      overview: {
        fillRatio: totalTarget > 0 ? totalReceived / totalTarget : 1,
        totalEvents: events.length,
        totalTargetQuantity: totalTarget,
        totalReceivedQuantity: totalReceived,
        totalDonations,
        totalVolunteers,
        totalTrips,
        totalDistributedQuantity: totalDistributed,
        totalEvidencesApproved: totalEvidences,
      },
    };
  }

  private calculateTransparencyScore(donationCount: number, distributed: number, tripCount: number, evidenceCount: number): number {
    if (donationCount === 0) return 100;
    const distributionRate = distributed > 0 ? Math.min(donationCount / Math.max(donationCount, 1), 1) : 0;
    const evidenceRate = tripCount > 0 ? Math.min(evidenceCount / Math.max(tripCount * 3, 1), 1) : 1;
    return Math.round((distributionRate * 0.7 + evidenceRate * 0.3) * 100);
  }

  /**
   * Timeline của một thực thể (Entity Timeline)
   */
  async getEntityTimeline(args: GetEntityTimelineArgs, actor: AuthenticatedUser | null): Promise<any> {
    const entityType = args.entityType.toUpperCase() as TransparencyEntityType;
    if (!Object.values(TransparencyEntityType).includes(entityType)) {
      throw new Error(`EntityType không hợp lệ: ${args.entityType}`);
    }

    const isPublicOnly = args.isPublicOnly ?? (actor?.systemRole !== 'ADMIN');

    const logs = await this.prisma.transparencyLog.findMany({
      where: {
        entityType,
        entityId: args.entityId,
        ...(isPublicOnly ? { isPublic: true } : {}),
      },
      include: { actor: { select: { id: true, fullName: true, systemRole: true } } },
      orderBy: { createdAt: 'asc' },
    });

    return {
      entityType,
      entityId: args.entityId,
      count: logs.length,
      timeline: logs.map(l => ({
        id: l.id,
        timestamp: l.createdAt.toISOString(),
        actorId: l.actorId,
        actorName: l.actor.fullName,
        actorRole: l.actor.systemRole,
        action: l.action,
        description: typeof l.details === 'object' && l.details && 'description' in l.details
          ? String((l.details as Record<string, unknown>).description)
          : l.action,
        oldStatus: l.oldStatus,
        newStatus: l.newStatus,
        eventId: l.eventId,
        isPublic: l.isPublic,
      })),
    };
  }
}