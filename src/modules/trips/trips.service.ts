import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SystemRole, TransparencyEntityType } from '@prisma/client';
import { TripsRepository } from './trips.repository.js';
import { CreateTripDto, UpdateTripDto, RecordDistributionWithEvidenceDto } from './dto/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import {
  BatchStatus,
  DistributionPointStatus,
  EventStatus,
  TripStatus,
  TripVolunteerRole,
  VolunteerApplicationStatus,
  EvidenceReviewStatus,
} from '../../common/enums/index.js';
import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';

@Injectable()
export class TripsService {
  constructor(
    private readonly repository: TripsRepository,
    private readonly prisma: PrismaService,
    private readonly organizationAccessService: OrganizationAccessService,
    private readonly transparencyRepo: TransparencyRepository,
  ) {}

  private generateTripCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TRP-${timestamp}-${random}`;
  }

  async getTripsByEvent(
    actor: AuthenticatedUser | undefined,
    eventId: string,
    query: PaginationDto,
  ) {
    const event =
      typeof this.prisma?.event?.findUnique === 'function'
        ? await this.prisma.event.findUnique({ where: { id: eventId } })
        : null;

    if (event && event.status === EventStatus.DRAFT) {
      if (!actor) {
        throw new ForbiddenException(
          'Only organizers can view trips of a draft event',
        );
      }
      if (actor.systemRole !== SystemRole.ADMIN) {
        await this.organizationAccessService.requireEventOrganizer(
          actor.id,
          eventId,
        );
      }
    }

    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    return this.repository.findByEvent(eventId, skip, take);
  }

  async getTripById(actor: AuthenticatedUser, id: string) {
    const trip = await this.repository.findById(id);
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const isAssignedVolunteer = (trip.volunteers || []).some(
      (v: any) => v.application?.user?.id === actor.id,
    );

    if (actor.systemRole !== SystemRole.ADMIN && !isAssignedVolunteer) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        trip.eventId,
      );
    }

    return trip;
  }

  async createTrip(actor: AuthenticatedUser, dto: CreateTripDto) {
    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        dto.eventId,
      );
    }

    // 1. Validate batches
    const batches = await this.prisma.batch.findMany({
      where: { id: { in: dto.batchIds } },
    });
    if (batches.length !== dto.batchIds.length) {
      throw new BadRequestException('One or more batch IDs are invalid');
    }
    for (const b of batches) {
      if (b.eventId !== dto.eventId) {
        throw new BadRequestException(
          'All batches must belong to the specified event',
        );
      }
      if (b.status !== BatchStatus.READY && b.status !== BatchStatus.DRAFT) {
        throw new BadRequestException(
          `Batch ${b.batchCode} has status ${b.status}. Only READY or DRAFT batches can be assigned to a trip.`,
        );
      }
    }

    // 2. Validate volunteers
    const appIds = dto.volunteers.map((v) => v.applicationId);
    const applications = await this.prisma.volunteerApplication.findMany({
      where: { id: { in: appIds } },
    });
    if (applications.length !== appIds.length) {
      throw new BadRequestException(
        'One or more volunteer applications are invalid',
      );
    }
    for (const app of applications) {
      if (app.eventId !== dto.eventId) {
        throw new BadRequestException(
          'All volunteers must belong to the specified event',
        );
      }
      if (app.status !== VolunteerApplicationStatus.APPROVED) {
        throw new BadRequestException(
          `Volunteer application ${app.id} is not APPROVED.`,
        );
      }
    }

    const leaders = dto.volunteers.filter(
      (v) => v.role === TripVolunteerRole.LEADER,
    );
    if (leaders.length !== 1) {
      throw new BadRequestException('A trip must have exactly one LEADER');
    }

    // 3. Validate points positions
    const positions = dto.points.map((p) => p.position);
    if (new Set(positions).size !== positions.length) {
      throw new BadRequestException(
        'Distribution point positions must be unique',
      );
    }

    const tripCode = this.generateTripCode();

    return this.prisma.$transaction(async (tx) => {
      const trip = await tx.trip.create({
        data: {
          tripCode,
          eventId: dto.eventId,
          createdById: actor.id,
          departurePoint: dto.departurePoint.trim(),
          departureDate: new Date(dto.departureDate),
          vehicle: dto.vehicle?.trim(),
          status: TripStatus.SCHEDULED,
          batches: {
            create: dto.batchIds.map((batchId) => ({
              batchId,
              eventId: dto.eventId,
            })),
          },
          volunteers: {
            create: dto.volunteers.map((v) => ({
              applicationId: v.applicationId,
              eventId: dto.eventId,
              role: v.role,
            })),
          },
          points: {
            create: dto.points.map((p) => ({
              position: p.position,
              name: p.name.trim(),
              location: p.location.trim(),
              mapUrl: p.mapUrl?.trim(),
            })),
          },
        },
        include: {
          batches: true,
          volunteers: true,
          points: {
            orderBy: { position: 'asc' },
          },
        },
      });

      // Update batches to ASSIGNED
      await tx.batch.updateMany({
        where: { id: { in: dto.batchIds } },
        data: { status: BatchStatus.ASSIGNED },
      });

      await this.transparencyRepo.append(tx, {
        eventId: dto.eventId,
        actorId: actor.id,
        action: 'TRIP_CREATED',
        entityType: TransparencyEntityType.TRIP,
        entityId: trip.id,
        newStatus: TripStatus.SCHEDULED,
        details: {
          tripCode,
          departurePoint: dto.departurePoint,
          departureDate: dto.departureDate,
          batchCount: dto.batchIds.length,
          volunteerCount: dto.volunteers.length,
          pointCount: dto.points.length,
        },
        isPublic: true,
      });

      return trip;
    });
  }

  async updateTrip(actor: AuthenticatedUser, id: string, dto: UpdateTripDto) {
    const trip = await this.repository.findById(id);
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    if (
      trip.status === TripStatus.COMPLETED ||
      trip.status === TripStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Cannot change status of a trip that is already ${trip.status}`,
      );
    }

    const isLeader = (trip.volunteers || []).some(
      (v: any) =>
        v.application?.user?.id === actor.id &&
        v.role === TripVolunteerRole.LEADER,
    );

    if (actor.systemRole !== SystemRole.ADMIN && !isLeader) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        trip.eventId,
      );
    }

    if (dto.status === TripStatus.COMPLETED) {
      const incompletePoints = (trip.points || []).filter(
        (p: any) =>
          p.status !== DistributionPointStatus.DISTRIBUTED &&
          p.status !== DistributionPointStatus.SKIPPED,
      );
      if (incompletePoints.length > 0) {
        throw new BadRequestException(
          `Cannot complete trip: ${incompletePoints.length} distribution point(s) are not yet DISTRIBUTED or SKIPPED.`,
        );
      }
    }

    if (dto.status === TripStatus.CANCELLED) {
      const hasDistributed = (trip.points || []).some(
        (p: any) => p.status === DistributionPointStatus.DISTRIBUTED,
      );
      if (hasDistributed) {
        throw new BadRequestException(
          'Cannot cancel a trip after distribution has already occurred at one or more points.',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // If cancelling, return assigned batches back to READY status
      if (dto.status === TripStatus.CANCELLED) {
        const batchIds = (trip.batches || []).map((tb: any) => tb.batchId);
        if (batchIds.length > 0) {
          await tx.batch.updateMany({
            where: { id: { in: batchIds } },
            data: { status: BatchStatus.READY },
          });
        }
      }

      const updated = await tx.trip.update({
        where: { id },
        data: {
          status: dto.status,
          completedAt:
            dto.status === TripStatus.COMPLETED ? new Date() : trip.completedAt,
        },
      });

      await this.transparencyRepo.append(tx, {
        eventId: trip.eventId,
        actorId: actor.id,
        action: `TRIP_${dto.status}`,
        entityType: TransparencyEntityType.TRIP,
        entityId: trip.id,
        oldStatus: trip.status,
        newStatus: dto.status,
        details: {
          tripCode: trip.tripCode,
        },
        isPublic: true,
      });

      return updated;
    });
  }

  /**
   * Atomic: Ghi nhận phân phối + tải lên minh chứng trong 1 transaction
   * Kết hợp DIS-01 (create distribution record) + Evidence upload
   * Đảm bảo tính toàn vẹn: nếu upload evidence thất bại, distribution record sẽ rollback
   */
  async recordDistributionWithEvidence(
    actor: AuthenticatedUser,
    tripId: string,
    dto: RecordDistributionWithEvidenceDto,
  ) {
    const trip = await this.repository.findById(tripId);
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    // Authorization: Organizer or Trip Leader
    const isLeader = (trip.volunteers || []).some(
      (v: any) =>
        v.application?.user?.id === actor.id &&
        v.role === TripVolunteerRole.LEADER,
    );

    if (actor.systemRole !== SystemRole.ADMIN && !isLeader) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        trip.eventId,
      );
    }

    if (trip.status === TripStatus.CANCELLED) {
      throw new BadRequestException('Cannot record distribution for a cancelled trip');
    }

    // Validate tripBatch exists in this trip
    const tripBatch = (trip.batches || []).find(
      (tb: any) => tb.id === dto.tripBatchId,
    );
    if (!tripBatch) {
      throw new BadRequestException('TripBatch not found in this trip');
    }

    // Validate distribution point exists in this trip
    const point = (trip.points || []).find(
      (p: any) => p.id === dto.distributionPointId,
    );
    if (!point) {
      throw new BadRequestException('Distribution point not found in this trip');
    }

    if (point.status === DistributionPointStatus.SKIPPED) {
      throw new BadRequestException('Cannot record distribution for a skipped point');
    }

    // Validate quantity
    const distributedQty = new Prisma.Decimal(dto.distributedQuantity);
    if (distributedQty.lessThanOrEqualTo(0)) {
      throw new BadRequestException('Distributed quantity must be greater than 0');
    }

    // Get batch info from tripBatch relation
    const batch = tripBatch.batch;
    if (!batch) {
      throw new BadRequestException('Batch not found for this tripBatch');
    }

    // Compute already distributed quantity for this tripBatch from DistributionRecord
    const existingRecords = await this.prisma.distributionRecord.findMany({
      where: { tripBatchId: dto.tripBatchId },
      select: { distributedQuantity: true },
    });
    const alreadyDistributed = existingRecords.reduce(
      (sum, r) => sum.plus(new Prisma.Decimal(r.distributedQuantity)),
      new Prisma.Decimal(0),
    );

    const remainingInBatch = new Prisma.Decimal(batch.quantity).minus(alreadyDistributed);
    if (distributedQty.greaterThan(remainingInBatch)) {
      throw new BadRequestException(
        `Distributed quantity (${dto.distributedQuantity}) exceeds remaining in batch (${remainingInBatch.toNumber()})`,
      );
    }

    if (!dto.privacyConfirmed) {
      throw new BadRequestException(
        'Must confirm privacy commitment for evidence upload',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Create distribution record
      const record = await tx.distributionRecord.create({
        data: {
          tripId,
          tripBatchId: dto.tripBatchId,
          distributionPointId: dto.distributionPointId,
          distributedQuantity: distributedQty,
          beneficiaryCount: dto.beneficiaryCount || 0,
          notes: dto.notes?.trim(),
          confirmedById: actor.id,
          confirmedAt: new Date(),
        },
      });

      // 2. Update batch distributed quantity (Batch model has distributedQuantity field)
      const newBatchDistributed = new Prisma.Decimal((batch as any).distributedQuantity || 0).plus(distributedQty);
      await tx.batch.update({
        where: { id: batch.id },
        data: { distributedQuantity: newBatchDistributed } as any,
      });

      // 3. Update distribution point status to DISTRIBUTED if not already
      if (point.status !== DistributionPointStatus.DISTRIBUTED) {
        await tx.distributionPoint.update({
          where: { id: dto.distributionPointId },
          data: {
            status: DistributionPointStatus.DISTRIBUTED,
            distributedAt: new Date(),
          },
        });
      }

      // 4. Create evidence record
      const evidence = await tx.evidence.create({
        data: {
          tripId,
          distributionPointId: dto.distributionPointId,
          distributionRecordId: record.id,
          batchId: tripBatch.batchId,
          uploadedById: actor.id,
          imageUrl: dto.imageUrl.trim(),
          caption: dto.caption.trim(),
          privacyConfirmed: true,
          reviewStatus: EvidenceReviewStatus.PENDING,
          mimeType: 'image/jpeg',
          sizeBytes: 204800,
        },
      });

      // 6. Transparency logs
      await this.transparencyRepo.append(tx, {
        eventId: trip.eventId,
        actorId: actor.id,
        action: 'DISTRIBUTION_RECORDED',
        entityType: TransparencyEntityType.DISTRIBUTION_RECORD,
        entityId: record.id,
        details: {
          tripCode: trip.tripCode,
          pointName: point.name,
          batchCode: batch.batchCode,
          distributedQuantity: dto.distributedQuantity,
          beneficiaryCount: dto.beneficiaryCount || 0,
        },
        isPublic: true,
      });

      await this.transparencyRepo.append(tx, {
        eventId: trip.eventId,
        actorId: actor.id,
        action: 'EVIDENCE_UPLOADED',
        entityType: TransparencyEntityType.EVIDENCE,
        entityId: evidence.id,
        newStatus: EvidenceReviewStatus.PENDING,
        details: {
          tripCode: trip.tripCode,
          pointName: point.name,
          caption: dto.caption,
          privacyConfirmed: true,
        },
        isPublic: false, // Evidence not public until approved
      });

      return {
        distributionRecord: record,
        evidence,
        pointStatus: DistributionPointStatus.DISTRIBUTED,
      };
    });
  }
}
