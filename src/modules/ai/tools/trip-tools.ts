/**
 * Function Calling Tools - Trips (Chuyến xe phân phối)
 */

import { Prisma, TripStatus, DistributionPointStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.js';
import { OrganizationAccessService } from '../../organizations/organization-access.service.js';

export interface GetTripDetailArgs {
  tripId: string;
  userId?: string;
}

export interface GetTripsByEventArgs {
  eventId: string;
  status?: string;
  userId?: string;
}

export class TripTools {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAccess: OrganizationAccessService,
  ) {}

  /**
   * Chi tiết chuyến xe (Trip)
   * Organizer/Admin hoặc Volunteer được gán vào Trip
   */
  async getTripDetail(args: GetTripDetailArgs, actor: AuthenticatedUser | null): Promise<any> {
    const trip = await this.prisma.trip.findUnique({
      where: { id: args.tripId },
      include: {
        event: { include: { organization: true } },
        createdBy: { select: { id: true, fullName: true } },
        batches: {
          include: {
            batch: {
              include: {
                itemType: true, unit: true,
                donations: { select: { trackingId: true, quantity: true } },
              },
            },
          },
        },
        volunteers: {
          include: {
            application: {
              include: { user: { select: { fullName: true } }, volunteerRole: { select: { name: true } } },
            },
          },
        },
        points: {
          orderBy: { position: 'asc' },
          include: {
            records: {
              include: {
                tripBatch: { include: { batch: { select: { batchCode: true } } } },
                evidence: { where: { reviewStatus: 'APPROVED', privacyConfirmed: true }, select: { caption: true, imageUrl: true } },
              },
            },
            evidence: { where: { reviewStatus: 'APPROVED', privacyConfirmed: true }, select: { caption: true, imageUrl: true, uploadedAt: true } },
          },
        },
        evidence: { where: { reviewStatus: 'APPROVED', privacyConfirmed: true }, select: { caption: true, imageUrl: true, uploadedAt: true } },
      },
    });

    if (!trip) {
      throw new Error(`Không tìm thấy chuyến xe: ${args.tripId}`);
    }

    // Auth check: Organizer/Admin hoặc Volunteer gán vào trip
    const isAssignedVolunteer = trip.volunteers.some(v => v.application.userId === actor?.id);
    if (actor?.systemRole !== 'ADMIN' && !isAssignedVolunteer) {
      if (!actor) throw new Error('Cần đăng nhập');
      await this.orgAccess.requireEventOrganizer(actor.id, trip.eventId);
    }

    // Query transparency logs separately (Trip doesn't have direct relation)
    const transparencyLogs = await this.prisma.transparencyLog.findMany({
      where: { entityType: 'TRIP', entityId: trip.id, isPublic: true },
      orderBy: { createdAt: 'asc' },
      take: 30,
      include: { actor: { select: { fullName: true, systemRole: true } } },
    });

    const totalBatchQty = trip.batches.reduce((s, tb) => s + Number(tb.batch.quantity), 0);
    const totalDistributed = trip.points.reduce((s, p) =>
      s + p.records.reduce((s2, r) => s2 + Number(r.distributedQuantity), 0), 0);

    return {
      id: trip.id,
      tripCode: trip.tripCode,
      status: trip.status,
      event: { id: trip.event.id, title: trip.event.title, location: trip.event.location },
      departurePoint: trip.departurePoint,
      departureDate: trip.departureDate.toISOString(),
      vehicle: trip.vehicle,
      completedAt: trip.completedAt?.toISOString(),
      batches: trip.batches.map(tb => ({
        batchCode: tb.batch.batchCode,
        item: `${Number(tb.batch.quantity)} ${tb.batch.unit.name} ${tb.batch.itemType.name}`,
        quantity: Number(tb.batch.quantity),
        status: tb.batch.status,
      })),
      volunteers: trip.volunteers.map(v => ({
        name: v.application.user.fullName,
        role: v.role,
        volunteerRole: v.application.volunteerRole.name,
      })),
      points: trip.points.map(p => ({
        id: p.id,
        position: p.position,
        name: p.name,
        location: p.location,
        mapUrl: p.mapUrl,
        status: p.status,
        arrivedAt: p.arrivedAt?.toISOString(),
        distributedAt: p.distributedAt?.toISOString(),
        skippedReason: p.skippedReason,
        records: p.records.map(r => ({
          batchCode: r.tripBatch.batch.batchCode,
          distributedQuantity: Number(r.distributedQuantity),
          beneficiaryCount: r.beneficiaryCount,
          confirmedAt: r.confirmedAt.toISOString(),
          evidence: r.evidence,
        })),
        evidence: p.evidence,
      })),
      evidence: trip.evidence,
      timeline: transparencyLogs.map((l: any) => ({
        timestamp: l.createdAt.toISOString(),
        actor: l.actor.fullName,
        actorRole: l.actor.systemRole,
        action: l.action,
        description: typeof l.details === 'object' && l.details && 'description' in l.details
          ? String((l.details as Record<string, unknown>).description)
          : l.action,
      })),
      summary: {
        totalBatchQuantity: totalBatchQty,
        totalDistributed,
        remainingToDistribute: Math.max(0, totalBatchQty - totalDistributed),
        pointsCompleted: trip.points.filter(p => p.status === DistributionPointStatus.DISTRIBUTED).length,
        pointsTotal: trip.points.length,
      },
      createdAt: trip.createdAt.toISOString(),
      updatedAt: trip.updatedAt.toISOString(),
      tripHref: `/organizer/trips/${trip.id}`,
    };
  }

  /**
   * Danh sách Trip của Event
   */
  async getTripsByEvent(args: GetTripsByEventArgs, actor: AuthenticatedUser | null): Promise<any> {
    const event = await this.prisma.event.findUnique({
      where: { id: args.eventId },
      select: { id: true, title: true, organizationId: true },
    });

    if (!event) throw new Error(`Không tìm thấy Event: ${args.eventId}`);

    if (actor?.systemRole !== 'ADMIN') {
      if (!actor) throw new Error('Cần đăng nhập');
      // Volunteer được xem trip của mình
      const isAssignedVolunteer = await this.prisma.tripVolunteer.findFirst({
        where: { trip: { eventId: args.eventId }, application: { userId: actor.id } },
      });
      if (!isAssignedVolunteer) {
        await this.orgAccess.requireEventOrganizer(actor.id, args.eventId);
      }
    }

    const where: Prisma.TripWhereInput = { eventId: args.eventId };
    if (args.status) where.status = args.status as TripStatus;

    const trips = await this.prisma.trip.findMany({
      where,
      orderBy: { departureDate: 'desc' },
      include: {
        batches: { include: { batch: { select: { batchCode: true, status: true } } } },
        volunteers: { include: { application: { select: { user: { select: { fullName: true } } } } } },
        points: { select: { status: true } },
      },
    });

    const mapped = trips.map(t => {
      const pointStats = t.points.reduce((acc, p) => {
        acc[p.status] = (acc[p.status] || 0) + 1;
        return acc;
      }, {} as Record<string, number>);

      return {
        id: t.id,
        tripCode: t.tripCode,
        status: t.status,
        departurePoint: t.departurePoint,
        departureDate: t.departureDate.toISOString(),
        vehicle: t.vehicle,
        batchCodes: t.batches.map(tb => tb.batch.batchCode),
        volunteerNames: t.volunteers.map(v => v.application.user.fullName),
        pointStats,
        completedPoints: pointStats[DistributionPointStatus.DISTRIBUTED] || 0,
        totalPoints: t.points.length,
        createdAt: t.createdAt.toISOString(),
        tripHref: `/organizer/trips/${t.id}`,
      };
    });

    return { count: mapped.length, trips: mapped };
  }
}