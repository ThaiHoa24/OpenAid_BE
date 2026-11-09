import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransparencyEntityType } from '@prisma/client';
import { DonationsRepository } from './donations.repository.js';
import { CreateDonationDto, ReceiveDonationDto } from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';
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

  /**
   * KAN-25 / US-15: Đăng ký Quyên góp Hiện vật
   * Tự động sinh mã trackingId duy nhất (DON-YYYY-XXXXXX).
   */
  async createDonation(donorId: string, dto: CreateDonationDto) {
    // 1. Phân giải DonationNeed từ donationNeedId hoặc bộ composite (eventId, itemTypeId, unitId)
    let donationNeed;
    if (dto.donationNeedId) {
      donationNeed = await this.repository.findDonationNeed(dto.donationNeedId);
    } else if (dto.eventId && dto.itemTypeId && dto.unitId) {
      donationNeed = await this.repository.findDonationNeedByComposite(
        dto.eventId,
        dto.itemTypeId,
        dto.unitId,
      );
    } else {
      throw new BadRequestException(
        'Either donationNeedId or (eventId, itemTypeId, unitId) must be provided',
      );
    }

    if (!donationNeed) {
      throw new BadRequestException('Donation need not found or invalid');
    }

    // 2. Kiểm tra trạng thái Event: chỉ chấp nhận quyên góp cho Event PUBLISHED
    if (donationNeed.event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException(
        `Donations are only accepted for PUBLISHED events (current status: ${donationNeed.event.status})`,
      );
    }

    // 3. Tự động sinh mã Tracking ID duy nhất
    const trackingId = await this.generateUniqueTrackingId();

    // 4. Tạo Donation và ghi nhận Transparency Audit Log trong cùng một transaction
    return this.prisma.$transaction(async (tx) => {
      const donation = await this.repository.create(
        {
          trackingId,
          donorId,
          eventId: donationNeed.eventId,
          donationNeedId: donationNeed.id,
          itemTypeId: donationNeed.itemTypeId,
          unitId: donationNeed.unitId,
          quantity: new Prisma.Decimal(dto.quantity),
          status: DonationStatus.PENDING,
        },
        tx,
      );

      await this.transparencyRepo.append(tx, {
        eventId: donation.eventId,
        action: 'DONATION_CREATED',
        entityType: TransparencyEntityType.DONATION,
        entityId: donation.id,
        actorId: donorId,
        newStatus: DonationStatus.PENDING,
        details: {
          trackingId: donation.trackingId,
          quantity: dto.quantity,
          unit: donationNeed.unit.name,
          itemType: donationNeed.itemType.name,
        },
        isPublic: true,
      });

      return donation;
    });
  }

  /**
   * KAN-25 / US-16: Lấy danh sách My Donations của người dùng hiện tại
   */
  async getMyDonations(donorId: string, query: PaginationDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;
    return this.repository.findByDonorId(donorId, { skip, take });
  }

  /**
   * KAN-26 / US-17: Duyệt đơn quyên góp (Receipt Confirmation & Inventory update)
   * - Reject: đổi status sang REJECTED, không ảnh hưởng kho.
   * - Approve (RECEIVED): đổi status sang RECEIVED, tự động upsert cộng dồn vào Inventory trong cùng $transaction.
   */
  async receiveDonation(
    actor: AuthenticatedUser,
    id: string,
    dto: ReceiveDonationDto,
  ) {
    const donation = await this.repository.findById(id);
    if (!donation) {
      throw new NotFoundException('Donation not found');
    }

    // 1. Phân quyền: Người xác nhận phải là ORGANIZER của tổ chức sở hữu Event
    await this.organizationAccessService.requireOrganizer(
      actor.id,
      donation.event.organizationId,
    );

    // 2. Chỉ tiếp nhận hoặc từ chối các đơn đang ở trạng thái PENDING
    if (donation.status !== DonationStatus.PENDING) {
      throw new BadRequestException(
        `Only PENDING donations can be received or rejected (current status: ${donation.status})`,
      );
    }

    // 3. Xử lý Từ chối (REJECTED)
    if (dto.status === DonationStatus.REJECTED) {
      if (!dto.rejectionReason?.trim()) {
        throw new BadRequestException(
          'rejectionReason is required when rejecting a donation',
        );
      }

      return this.prisma.$transaction(async (tx) => {
        const updated = await this.repository.update(
          id,
          {
            status: DonationStatus.REJECTED,
            rejectionReason: dto.rejectionReason!.trim(),
            receivedBy: { connect: { id: actor.id } },
            receivedAt: new Date(),
          },
          tx,
        );

        await this.transparencyRepo.append(tx, {
          eventId: donation.eventId,
          action: 'DONATION_REJECTED',
          entityType: TransparencyEntityType.DONATION,
          entityId: donation.id,
          actorId: actor.id,
          oldStatus: donation.status,
          newStatus: DonationStatus.REJECTED,
          details: {
            trackingId: donation.trackingId,
            rejectionReason: dto.rejectionReason!.trim(),
          },
          isPublic: true,
        });

        return updated;
      });
    }

    // 4. Xử lý Xác nhận tiếp nhận vào kho (RECEIVED)
    const quantity =
      dto.receivedQuantity !== undefined
        ? new Prisma.Decimal(dto.receivedQuantity)
        : donation.quantity;

    return this.prisma.$transaction(async (tx) => {
      // Cập nhật trạng thái đơn quyên góp thành RECEIVED
      const updated = await this.repository.update(
        id,
        {
          status: DonationStatus.RECEIVED,
          receivedQuantity: quantity,
          receivedBy: { connect: { id: actor.id } },
          receivedAt: new Date(),
        },
        tx,
      );

      // Cập nhật Inventory: nếu trùng eventId + itemTypeId + unitId thì cộng dồn, chưa có thì tạo mới
      await this.repository.upsertInventory(
        {
          eventId: donation.eventId,
          itemTypeId: donation.itemTypeId,
          unitId: donation.unitId,
          quantity,
        },
        tx,
      );

      // Ghi nhật ký kiểm toán minh bạch
      await this.transparencyRepo.append(tx, {
        eventId: donation.eventId,
        action: 'DONATION_RECEIVED',
        entityType: TransparencyEntityType.DONATION,
        entityId: donation.id,
        actorId: actor.id,
        oldStatus: donation.status,
        newStatus: DonationStatus.RECEIVED,
        details: {
          trackingId: donation.trackingId,
          receivedQuantity: quantity.toString(),
        },
        isPublic: true,
      });

      return updated;
    });
  }

  async getEventDonations(
    _actor: AuthenticatedUser,
    _eventId: string,
    _query: PaginationDto,
  ): Promise<never> {
    return featureNotImplemented('FR03/FR14: organization-scoped donations');
  }

  async cancelDonation(_donorId: string, _id: string): Promise<never> {
    return featureNotImplemented(
      'FR12: cancel own pending donation with audit log',
    );
  }

  /**
   * Sinh mã Tracking ID ngẫu nhiên định dạng DON-YYYY-XXXXXX
   * và kiểm tra chống va chạm unique key trong database.
   */
  private async generateUniqueTrackingId(): Promise<string> {
    const year = new Date().getFullYear();
    const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
    const maxAttempts = 5;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      let randomPart = '';
      for (let i = 0; i < 6; i++) {
        randomPart += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      const candidate = `DON-${year}-${randomPart}`;
      const existing = await this.repository.findByTrackingId(candidate);
      if (!existing) {
        return candidate;
      }
    }

    const timestamp = Date.now().toString(36).toUpperCase();
    return `DON-${year}-${timestamp}`;
  }
}
