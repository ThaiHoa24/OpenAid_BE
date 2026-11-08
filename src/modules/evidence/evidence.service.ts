import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SystemRole, TransparencyEntityType } from '@prisma/client';
import { CreateEvidenceDto, ReviewEvidenceDto } from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { EvidenceReviewStatus } from '../../common/enums/index.js';
import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';

@Injectable()
export class EvidenceService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly organizationAccessService: OrganizationAccessService,
    private readonly transparencyRepo: TransparencyRepository,
  ) {}

  async createEvidence(actor: AuthenticatedUser, dto: CreateEvidenceDto) {
    const trip = await this.prisma.trip.findUnique({
      where: { id: dto.tripId },
      include: { points: true },
    });
    if (!trip) {
      throw new NotFoundException('Trip not found');
    }

    const point = trip.points.find((p) => p.id === dto.distributionPointId);
    if (!point) {
      throw new BadRequestException(
        'Distribution point does not belong to this trip',
      );
    }

    if (dto.distributionRecordId) {
      const record = await this.prisma.distributionRecord.findUnique({
        where: { id: dto.distributionRecordId },
      });
      if (!record || record.tripId !== dto.tripId) {
        throw new BadRequestException(
          'Distribution record does not belong to this trip',
        );
      }
    }

    const imageUrl =
      dto.imageUrl ||
      'https://images.unsplash.com/photo-1488521787991-ed7bbaae773c?w=800&auto=format&fit=crop&q=80';
    const mimeType = dto.mimeType || 'image/jpeg';
    const sizeBytes = dto.sizeBytes || 204800;

    return this.prisma.$transaction(async (tx) => {
      const evidence = await tx.evidence.create({
        data: {
          tripId: dto.tripId,
          distributionPointId: dto.distributionPointId,
          distributionRecordId: dto.distributionRecordId,
          uploadedById: actor.id,
          imageUrl,
          mimeType,
          sizeBytes,
          caption: dto.caption?.trim(),
          privacyConfirmed: dto.privacyConfirmed,
          reviewStatus: EvidenceReviewStatus.PENDING,
        },
        include: {
          point: true,
          uploadedBy: {
            select: {
              id: true,
              fullName: true,
              email: true,
            },
          },
        },
      });

      await this.transparencyRepo.append(tx, {
        eventId: trip.eventId,
        actorId: actor.id,
        action: 'EVIDENCE_SUBMITTED',
        entityType: TransparencyEntityType.EVIDENCE,
        entityId: evidence.id,
        newStatus: EvidenceReviewStatus.PENDING,
        evidenceId: evidence.id,
        details: {
          tripCode: trip.tripCode,
          pointName: point.name,
          caption: dto.caption,
        },
        isPublic: false,
      });

      return evidence;
    });
  }

  async getEvidenceByTrip(actor: AuthenticatedUser, tripId: string) {
    return this.prisma.evidence.findMany({
      where: { tripId },
      include: {
        point: true,
        record: true,
        uploadedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
      },
      orderBy: { uploadedAt: 'desc' },
    });
  }

  async reviewEvidence(
    actor: AuthenticatedUser,
    id: string,
    dto: ReviewEvidenceDto,
  ) {
    const evidence = await this.prisma.evidence.findUnique({
      where: { id },
      include: {
        trip: true,
        point: true,
      },
    });
    if (!evidence) {
      throw new NotFoundException('Evidence not found');
    }

    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        evidence.trip.eventId,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.evidence.update({
        where: { id },
        data: {
          reviewStatus: dto.status,
          reviewedById: actor.id,
          reviewedAt: new Date(),
          reviewNote: dto.note?.trim(),
        },
      });

      await this.transparencyRepo.append(tx, {
        eventId: evidence.trip.eventId,
        actorId: actor.id,
        action: `EVIDENCE_${dto.status}`,
        entityType: TransparencyEntityType.EVIDENCE,
        entityId: evidence.id,
        oldStatus: evidence.reviewStatus,
        newStatus: dto.status,
        evidenceId: evidence.id,
        details: {
          note: dto.note,
          caption: evidence.caption,
        },
        isPublic: dto.status === EvidenceReviewStatus.APPROVED,
      });

      return updated;
    });
  }
}
