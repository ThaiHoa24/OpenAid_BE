import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SystemRole, TransparencyEntityType } from '@prisma/client';
import { DonationsRepository } from './donations.repository.js';
import { CreateDonationDto, ReceiveDonationDto } from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import { DonationStatus, EventStatus } from '../../common/enums/index.js';
import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';

@Injectable()
export class DonationsService {
  constructor(
    private readonly repository: DonationsRepository,
    private readonly prisma: PrismaService,
    private readonly organizationAccessService: OrganizationAccessService,
    private readonly transparencyRepo: TransparencyRepository,
  ) {}

  private generateTrackingId(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `TRK-${timestamp}-${random}`;
  }

  async createDonation(donorId: string, dto: CreateDonationDto) {
    const need = await this.repository.findNeedWithEvent(dto.donationNeedId);
    if (!need) {
      throw new NotFoundException('Donation need not found');
    }

    if (need.event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException(
        `Cannot donate to an event in ${need.event.status} status. Only PUBLISHED events accept donations.`,
      );
    }

    const trackingId = this.generateTrackingId();
    const quantityDecimal = new Prisma.Decimal(dto.quantity);

    return this.prisma.$transaction(async (tx) => {
      const donation = await this.repository.create(
        {
          trackingId,
          eventId: need.eventId,
          donationNeedId: need.id,
          itemTypeId: need.itemTypeId,
          unitId: need.unitId,
          donorId,
          quantity: quantityDecimal,
          photoUrl: dto.photoUrl?.trim() || null,
          status: DonationStatus.PENDING,
        },
        tx,
      );

      await this.transparencyRepo.append(tx, {
        eventId: need.eventId,
        actorId: donorId,
        action: 'DONATION_PLEDGED',
        entityType: TransparencyEntityType.DONATION,
        entityId: donation.id,
        newStatus: DonationStatus.PENDING,
        details: {
          trackingId,
          quantity: dto.quantity,
          itemType: need.itemType.name,
          unit: need.unit.name,
          ...(dto.photoUrl?.trim() ? { photoUrl: dto.photoUrl.trim() } : {}),
          ...(dto.notes?.trim() ? { notes: dto.notes.trim() } : {}),
        },
        isPublic: true,
      });

      return donation;
    });
  }

  async getMyDonations(donorId: string, query: PaginationDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    return this.repository.findMyDonations(donorId, skip, take);
  }

  async getEventDonations(
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
    return this.repository.findEventDonations(eventId, skip, take);
  }

  async receiveDonation(
    actor: AuthenticatedUser,
    id: string,
    dto: ReceiveDonationDto,
  ) {
    const donation = await this.repository.findById(id);
    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        donation.eventId,
      );
    }

    if (donation.status !== DonationStatus.PENDING) {
      throw new BadRequestException(
        `Cannot receive or reject donation with status ${donation.status}. Must be PENDING.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      if (dto.status === DonationStatus.RECEIVED) {
        const updated = await this.repository.update(
          id,
          {
            status: DonationStatus.RECEIVED,
            receivedById: actor.id,
            receivedAt: new Date(),
            receivedQuantity: donation.quantity,
          },
          tx,
        );

        // Update inventory: add received quantity to availableQuantity
        await this.repository.upsertInventoryReceived(
          donation.eventId,
          donation.itemTypeId,
          donation.unitId,
          donation.quantity,
          tx,
        );

        await this.transparencyRepo.append(tx, {
          eventId: donation.eventId,
          actorId: actor.id,
          action: 'DONATION_RECEIVED',
          entityType: TransparencyEntityType.DONATION,
          entityId: donation.id,
          oldStatus: DonationStatus.PENDING,
          newStatus: DonationStatus.RECEIVED,
          details: {
            trackingId: donation.trackingId,
            receivedQuantity: donation.quantity.toNumber(),
          },
          isPublic: true,
        });

        return updated;
      } else {
        const updated = await this.repository.update(
          id,
          {
            status: DonationStatus.REJECTED,
            rejectionReason: dto.rejectionReason,
          },
          tx,
        );

        await this.transparencyRepo.append(tx, {
          eventId: donation.eventId,
          actorId: actor.id,
          action: 'DONATION_REJECTED',
          entityType: TransparencyEntityType.DONATION,
          entityId: donation.id,
          oldStatus: DonationStatus.PENDING,
          newStatus: DonationStatus.REJECTED,
          details: {
            trackingId: donation.trackingId,
            rejectionReason: dto.rejectionReason,
          },
          isPublic: false,
        });

        return updated;
      }
    });
  }

  async cancelDonation(donorId: string, id: string) {
    const donation = await this.repository.findById(id);
    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    if (donation.donorId !== donorId) {
      throw new ForbiddenException('You can only cancel your own donation');
    }

    if (donation.status !== DonationStatus.PENDING) {
      throw new BadRequestException(
        `Cannot cancel donation in status ${donation.status}. Only PENDING donations can be cancelled.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repository.update(
        id,
        {
          status: DonationStatus.CANCELLED,
        },
        tx,
      );

      await this.transparencyRepo.append(tx, {
        eventId: donation.eventId,
        actorId: donorId,
        action: 'DONATION_CANCELLED',
        entityType: TransparencyEntityType.DONATION,
        entityId: donation.id,
        oldStatus: DonationStatus.PENDING,
        newStatus: DonationStatus.CANCELLED,
        details: {
          trackingId: donation.trackingId,
        },
        isPublic: false,
      });

      return updated;
    });
  }
}
