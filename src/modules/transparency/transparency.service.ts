import { Injectable, NotFoundException } from '@nestjs/common';
import { TransparencyRepository } from './transparency.repository.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { EvidenceReviewStatus, SystemRole } from '../../common/enums/index.js';
import { TimelineQueryDto } from './dto/index.js';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class TransparencyService {
  constructor(
    private readonly repository: TransparencyRepository,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * KAN-18 / FR20: Admin audit logs query with skip & take
   */
  async getRecentAuditLogs(query: PaginationDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;

    const [items, total] = await Promise.all([
      this.repository.findRecentLogs({ skip, take }),
      this.repository.countLogs(),
    ]);

    return {
      items,
      total,
      skip,
      take,
    };
  }

  /**
   * KAN-18 / FR21: Entity transparency timeline
   */
  async getTimeline(actor: AuthenticatedUser, query: TimelineQueryDto) {
    const isPublicOnly = actor.systemRole !== SystemRole.ADMIN;
    return this.repository.findTimeline(
      query.entityType,
      query.entityId,
      isPublicOnly,
    );
  }

  /**
   * Public tracking by trackingId (FR21/FR22 public DTO chain)
   */
  async searchByTrackingId(trackingId: string) {
    const donation = await this.prisma.donation.findUnique({
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
                            tripBatch: {
                              include: {
                                batch: true,
                              },
                            },
                          },
                        },
                        evidence: {
                          where: {
                            reviewStatus: EvidenceReviewStatus.APPROVED,
                            privacyConfirmed: true,
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

    if (!donation) {
      throw new NotFoundException('Mã vận đơn cứu trợ không tồn tại');
    }

    const firstAssignment = donation.batch?.assignments[0];
    const trip = firstAssignment?.trip;

    // Timeline logs
    const timeline = await this.prisma.transparencyLog.findMany({
      where: {
        isPublic: true,
        OR: [
          { entityId: donation.id },
          ...(donation.batchId ? [{ entityId: donation.batchId }] : []),
          ...(trip ? [{ entityId: trip.id }] : []),
          { eventId: donation.eventId },
        ],
      },
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            systemRole: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const publicEvidences: Array<{
      id: string;
      imageUrl: string;
      caption: string;
      distributionPointName: string;
      uploadedAt: string;
    }> = [];

    const distributionPoints = (trip?.points || []).map((p) => {
      p.evidence.forEach((ev) => {
        publicEvidences.push({
          id: ev.id,
          imageUrl: ev.imageUrl,
          caption: ev.caption || '',
          distributionPointName: p.name,
          uploadedAt: ev.uploadedAt.toISOString(),
        });
      });

      return {
        id: p.id,
        name: p.name,
        address: p.location,
        order: p.position,
        status: p.status,
        arrivedAt: p.arrivedAt?.toISOString(),
        distributedAt: p.distributedAt?.toISOString(),
        records: p.records.map((r) => ({
          id: r.id,
          batchCode: r.tripBatch?.batch?.batchCode || '',
          itemType: donation.itemType.name,
          unit: donation.unit.name,
          distributedQuantity: r.distributedQuantity.toNumber(),
          recordedAt: r.confirmedAt.toISOString(),
        })),
      };
    });

    return {
      donation: {
        trackingId: donation.trackingId,
        itemType: donation.itemType.name,
        unit: donation.unit.name,
        quantity: donation.quantity.toNumber(),
        status: donation.status,
        createdAt: donation.createdAt.toISOString(),
        eventTitle: donation.event.title,
        organizationName: donation.event.organization.name,
        eventId: donation.eventId,
      },
      batch: donation.batch
        ? {
            id: donation.batch.id,
            batchCode: donation.batch.batchCode,
            itemType: donation.itemType.name,
            unit: donation.unit.name,
            totalQuantity: donation.batch.quantity.toNumber(),
            distributedQuantity: donation.batch.quantity
              .minus(donation.batch.returnedQuantity)
              .minus(donation.batch.lostQuantity)
              .toNumber(),
            returnedQuantity: donation.batch.returnedQuantity.toNumber(),
            remainingQuantity: donation.batch.returnedQuantity.toNumber(),
            lostQuantity: donation.batch.lostQuantity.toNumber(),
            status: donation.batch.status,
            createdAt: donation.batch.createdAt.toISOString(),
          }
        : undefined,
      trip: trip
        ? {
            id: trip.id,
            tripCode: trip.tripCode,
            departurePoint: trip.departurePoint,
            scheduledDate: trip.departureDate.toISOString(),
            status: trip.status,
            completedAt: trip.completedAt?.toISOString(),
          }
        : undefined,
      distributionPoints,
      publicEvidences,
      timeline: timeline.map((l) => ({
        id: l.id,
        timestamp: l.createdAt.toISOString(),
        actorId: l.actorId,
        actorName: l.actor.fullName,
        actorRole: l.actor.systemRole,
        action: l.action,
        description:
          typeof l.details === 'object' &&
          l.details &&
          'description' in l.details
            ? String((l.details as Record<string, unknown>).description)
            : l.action,
        oldStatus: l.oldStatus || undefined,
        newStatus: l.newStatus || undefined,
        entityType: l.entityType,
        entityId: l.entityId,
        eventId: l.eventId || undefined,
      })),
    };
  }
}
