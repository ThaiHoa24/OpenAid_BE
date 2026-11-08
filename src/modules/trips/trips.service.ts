import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SystemRole, TransparencyEntityType } from '@prisma/client';
import { TripsRepository } from './trips.repository.js';
import { CreateTripDto, UpdateTripDto } from './dto/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import {
  BatchStatus,
  TripStatus,
  VolunteerApplicationStatus,
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
    actor: AuthenticatedUser,
    eventId: string,
    query: PaginationDto,
  ) {
    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        eventId,
      );
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

    if (actor.systemRole !== SystemRole.ADMIN) {
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

    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        trip.eventId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
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
}
