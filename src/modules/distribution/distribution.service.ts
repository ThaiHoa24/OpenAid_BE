import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SystemRole, TransparencyEntityType } from '@prisma/client';
import { DistributionRepository } from './distribution.repository.js';
import {
  CreateDistributionDto,
  UpdateDistributionPointDto,
} from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import {
  DistributionPointStatus,
  TripVolunteerRole,
} from '../../common/enums/index.js';
import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';

@Injectable()
export class DistributionService {
  constructor(
    private readonly repository: DistributionRepository,
    private readonly prisma: PrismaService,
    private readonly organizationAccessService: OrganizationAccessService,
    private readonly transparencyRepo: TransparencyRepository,
  ) {}

  async createDistribution(
    actor: AuthenticatedUser,
    dto: CreateDistributionDto,
  ) {
    const tripBatch = await this.repository.findTripBatch(dto.tripBatchId);
    if (!tripBatch) {
      throw new NotFoundException('Trip batch assignment not found');
    }

    const point = await this.repository.findPoint(dto.distributionPointId);
    if (!point) {
      throw new NotFoundException('Distribution point not found');
    }

    if (tripBatch.tripId !== point.tripId) {
      throw new BadRequestException(
        'Trip batch and distribution point must belong to the same trip',
      );
    }

    const isLeader = await this.prisma.tripVolunteer.findFirst({
      where: {
        tripId: tripBatch.tripId,
        role: TripVolunteerRole.LEADER,
        application: {
          userId: actor.id,
        },
      },
    });

    if (actor.systemRole !== SystemRole.ADMIN && !isLeader) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        tripBatch.eventId,
      );
    }

    const qtyDecimal = new Prisma.Decimal(dto.distributedQuantity);

    // Validate that cumulative distributed quantity across points does not exceed the batch total
    const existingRecords = await this.prisma.distributionRecord.findMany({
      where: { tripBatchId: dto.tripBatchId },
    });
    const currentDistributed = existingRecords.reduce(
      (sum, r) => sum.plus(r.distributedQuantity),
      new Prisma.Decimal(0),
    );
    const newTotal = currentDistributed.plus(qtyDecimal);
    if (newTotal.greaterThan(tripBatch.batch.quantity)) {
      throw new BadRequestException(
        `Total distributed quantity (${newTotal}) would exceed the batch total quantity (${tripBatch.batch.quantity}). Already recorded: ${currentDistributed}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const record = await this.repository.createRecord(
        {
          tripId: tripBatch.tripId,
          tripBatchId: dto.tripBatchId,
          distributionPointId: dto.distributionPointId,
          distributedQuantity: qtyDecimal,
          beneficiaryCount: dto.beneficiaryCount ?? 0,
          notes: dto.notes?.trim(),
          confirmedById: actor.id,
        },
        tx,
      );

      // Auto update distribution point to DISTRIBUTED
      await this.repository.updatePoint(
        point.id,
        {
          status: DistributionPointStatus.DISTRIBUTED,
          distributedAt: new Date(),
        },
        tx,
      );

      await this.transparencyRepo.append(tx, {
        eventId: tripBatch.eventId,
        actorId: actor.id,
        action: 'DISTRIBUTION_RECORDED',
        entityType: TransparencyEntityType.DISTRIBUTION_RECORD,
        entityId: record.id,
        newStatus: DistributionPointStatus.DISTRIBUTED,
        details: {
          pointName: point.name,
          quantity: dto.distributedQuantity,
          beneficiaries: dto.beneficiaryCount,
          batchCode: tripBatch.batch.batchCode,
        },
        isPublic: true,
      });

      return record;
    });
  }

  async getDistributionById(actor: AuthenticatedUser, id: string) {
    const record = await this.repository.findRecordById(id);
    if (!record) {
      throw new NotFoundException('Distribution record not found');
    }
    return record;
  }

  async getDistributionsByTrip(actor: AuthenticatedUser, tripId: string) {
    return this.repository.findRecordsByTrip(tripId);
  }

  async updatePoint(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateDistributionPointDto,
  ) {
    const point = await this.repository.findPoint(id);
    if (!point) {
      throw new NotFoundException('Distribution point not found');
    }

    const isLeader = await this.prisma.tripVolunteer.findFirst({
      where: {
        tripId: point.tripId,
        role: TripVolunteerRole.LEADER,
        application: {
          userId: actor.id,
        },
      },
    });

    if (actor.systemRole !== SystemRole.ADMIN && !isLeader) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        point.trip.eventId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repository.updatePoint(
        id,
        {
          status: dto.status,
          arrivedAt:
            dto.status === DistributionPointStatus.ARRIVED
              ? new Date()
              : point.arrivedAt,
          distributedAt:
            dto.status === DistributionPointStatus.DISTRIBUTED
              ? new Date()
              : point.distributedAt,
          skippedReason:
            dto.status === DistributionPointStatus.SKIPPED
              ? dto.skippedReason
              : point.skippedReason,
        },
        tx,
      );

      await this.transparencyRepo.append(tx, {
        eventId: point.trip.eventId,
        actorId: actor.id,
        action: `POINT_${dto.status}`,
        entityType: TransparencyEntityType.DISTRIBUTION_POINT,
        entityId: point.id,
        oldStatus: point.status,
        newStatus: dto.status,
        details: {
          pointName: point.name,
          skippedReason: dto.skippedReason,
        },
        isPublic: true,
      });

      return updated;
    });
  }
}
