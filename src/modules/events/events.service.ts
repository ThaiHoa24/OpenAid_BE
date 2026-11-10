import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, TransparencyEntityType } from '@prisma/client';
import { EventsRepository } from './events.repository.js';
import {
  ChangeEventStatusDto,
  CreateEventDto,
  EventQueryDto,
  UpdateEventDto,
  DonationNeedInputDto,
} from './dto/index.js';
import { EventStatus, OrgStatus, SystemRole } from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';

@Injectable()
export class EventsService {
  constructor(
    private readonly repository: EventsRepository,
    private readonly prisma: PrismaService,
    private readonly organizationAccessService: OrganizationAccessService,
    private readonly transparencyRepo: TransparencyRepository,
  ) {}

  /**
   * US-07 & US-08: Khởi tạo Chiến dịch Cứu trợ (Event DRAFT)
   * kèm cấu hình Vị trí tuyển TNV (VolunteerRole) và Nhu cầu hiện vật (DonationNeed).
   */
  async createEvent(actor: AuthenticatedUser, dto: CreateEventDto) {
    // 1. Phân quyền: Người tạo phải là ORGANIZER của Organization tương ứng
    await this.organizationAccessService.requireOrganizer(
      actor.id,
      dto.organizationId,
    );

    // 2. Validate thời gian: startDate < endDate nếu có endDate
    const start = new Date(dto.startDate);
    let end: Date | null = null;
    if (dto.endDate) {
      end = new Date(dto.endDate);
      if (start >= end) {
        throw new BadRequestException('startDate must be before endDate');
      }
    }

    // 3. Validate Volunteer Roles (US-08)
    if (dto.volunteerRoles && dto.volunteerRoles.length > 0) {
      const roleNames = dto.volunteerRoles.map((r) =>
        r.name.trim().toLowerCase(),
      );
      if (new Set(roleNames).size !== roleNames.length) {
        throw new BadRequestException(
          'Volunteer role names must be unique within an event',
        );
      }
    }

    // 4. Validate Donation Needs (US-08)
    if (dto.donationNeeds && dto.donationNeeds.length > 0) {
      const needKeys = dto.donationNeeds.map(
        (n) => `${n.itemTypeId}:${n.unitId}`,
      );
      if (new Set(needKeys).size !== needKeys.length) {
        throw new BadRequestException(
          'Donation need itemType and unit combination must be unique',
        );
      }

      const itemTypeIds = dto.donationNeeds.map((n) => n.itemTypeId);
      const unitIds = dto.donationNeeds.map((n) => n.unitId);

      const [validItems, validUnits] = await Promise.all([
        this.repository.validateItemTypes(itemTypeIds),
        this.repository.validateUnits(unitIds),
      ]);

      if (validItems.length !== new Set(itemTypeIds).size) {
        throw new BadRequestException(
          'One or more item types are invalid or inactive',
        );
      }
      if (validUnits.length !== new Set(unitIds).size) {
        throw new BadRequestException(
          'One or more units are invalid or inactive',
        );
      }
    }

    // 5. Tạo Event ở trạng thái DRAFT cùng roles và needs trong 1 transaction
    return this.prisma.$transaction(async (tx) => {
      return this.repository.create(
        {
          organization: { connect: { id: dto.organizationId } },
          createdBy: { connect: { id: actor.id } },
          title: dto.title.trim(),
          description: dto.description?.trim(),
          location: dto.location.trim(),
          contactName: dto.contactName.trim(),
          contactPhone: dto.contactPhone?.trim(),
          startDate: start,
          endDate: end,
          status: EventStatus.DRAFT,
          volunteerRoles:
            dto.volunteerRoles && dto.volunteerRoles.length > 0
              ? {
                  create: dto.volunteerRoles.map((vr) => ({
                    name: vr.name.trim(),
                    quantity: vr.quantity,
                    description: vr.description?.trim(),
                  })),
                }
              : undefined,
          donationNeeds:
            dto.donationNeeds && dto.donationNeeds.length > 0
              ? {
                  create: dto.donationNeeds.map((dn) => ({
                    itemType: { connect: { id: dn.itemTypeId } },
                    unit: { connect: { id: dn.unitId } },
                    targetQuantity: new Prisma.Decimal(dn.targetQuantity),
                    notes: dn.notes?.trim(),
                  })),
                }
              : undefined,
        },
        tx,
      );
    });
  }

  /**
   * US-10: Khám phá & Tìm kiếm Chiến dịch công khai
   */
  async getAllEvents(query: EventQueryDto) {
    const where: Prisma.EventWhereInput = {
      // Mặc định công khai chỉ tìm sự kiện PUBLISHED (hoặc CLOSED nếu client yêu cầu rõ)
      status:
        query.status && query.status !== EventStatus.DRAFT
          ? query.status
          : EventStatus.PUBLISHED,
    };

    // Tìm kiếm từ khóa theo title, description, hoặc location
    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { location: { contains: term, mode: 'insensitive' } },
      ];
    }

    // Lọc theo khu vực (area nằm trong location)
    if (query.area?.trim()) {
      where.location = { contains: query.area.trim(), mode: 'insensitive' };
    }

    // Lọc theo thời gian bắt đầu
    if (query.from || query.to) {
      where.startDate = {};
      if (query.from) {
        where.startDate.gte = new Date(query.from);
      }
      if (query.to) {
        where.startDate.lte = new Date(query.to);
      }
    }

    // Lọc theo loại hàng hóa cần quyên góp
    if (query.itemTypeId) {
      where.donationNeeds = {
        some: { itemTypeId: query.itemTypeId },
      };
    }

    const skip = query.skip ?? 0;
    const take = query.take ?? 20;

    return this.repository.findMany({
      skip,
      take,
      where,
      orderBy: { startDate: 'asc' },
    });
  }

  /**
   * US-10: Xem chi tiết Chiến dịch
   */
  async getEventById(id: string) {
    const event = await this.repository.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return event;
  }

  /**
   * Cập nhật thông tin Chiến dịch và cấu hình Roles/Needs
   */
  async updateEvent(actor: AuthenticatedUser, id: string, dto: UpdateEventDto) {
    const event = await this.repository.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    // Quyền: phải là ORGANIZER của tổ chức sở hữu Event
    await this.organizationAccessService.requireOrganizer(
      actor.id,
      event.organizationId,
    );

    if (
      event.status === EventStatus.CLOSED ||
      event.status === EventStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot update a closed or cancelled event',
      );
    }

    // Validate thời gian
    const start = dto.startDate ? new Date(dto.startDate) : event.startDate;
    const end =
      dto.endDate !== undefined
        ? dto.endDate
          ? new Date(dto.endDate)
          : null
        : event.endDate;
    if (end && start >= end) {
      throw new BadRequestException('startDate must be before endDate');
    }

    // Validate Volunteer Roles nếu có cập nhật
    if (dto.volunteerRoles) {
      const roleNames = dto.volunteerRoles.map((r) =>
        r.name.trim().toLowerCase(),
      );
      if (new Set(roleNames).size !== roleNames.length) {
        throw new BadRequestException(
          'Volunteer role names must be unique within an event',
        );
      }
    }

    // Validate Donation Needs nếu có cập nhật
    if (dto.donationNeeds) {
      const needKeys = dto.donationNeeds.map(
        (n) => `${n.itemTypeId}:${n.unitId}`,
      );
      if (new Set(needKeys).size !== needKeys.length) {
        throw new BadRequestException(
          'Donation need itemType and unit combination must be unique',
        );
      }

      const itemTypeIds = dto.donationNeeds.map((n) => n.itemTypeId);
      const unitIds = dto.donationNeeds.map((n) => n.unitId);

      const [validItems, validUnits] = await Promise.all([
        this.repository.validateItemTypes(itemTypeIds),
        this.repository.validateUnits(unitIds),
      ]);

      if (validItems.length !== new Set(itemTypeIds).size) {
        throw new BadRequestException(
          'One or more item types are invalid or inactive',
        );
      }
      if (validUnits.length !== new Set(unitIds).size) {
        throw new BadRequestException(
          'One or more units are invalid or inactive',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      // Nếu có cập nhật volunteerRoles
      if (dto.volunteerRoles) {
        if (event.status !== EventStatus.DRAFT) {
          const appCount = await tx.volunteerApplication.count({
            where: { eventId: id },
          });
          if (appCount > 0) {
            throw new BadRequestException(
              'Cannot reconfigure volunteer roles after applications have been submitted',
            );
          }
        }
        await this.repository.deleteVolunteerRoles(id, tx);
        for (const vr of dto.volunteerRoles) {
          await tx.volunteerRole.create({
            data: {
              eventId: id,
              name: vr.name.trim(),
              quantity: vr.quantity,
              description: vr.description?.trim(),
            },
          });
        }
      }

      // Nếu có cập nhật donationNeeds
      if (dto.donationNeeds) {
        if (event.status !== EventStatus.DRAFT) {
          const donCount = await tx.donation.count({
            where: { eventId: id },
          });
          if (donCount > 0) {
            throw new BadRequestException(
              'Cannot reconfigure donation needs after donations have been pledged',
            );
          }
        }
        await this.repository.deleteDonationNeeds(id, tx);
        for (const dn of dto.donationNeeds) {
          await tx.donationNeed.create({
            data: {
              eventId: id,
              itemTypeId: dn.itemTypeId,
              unitId: dn.unitId,
              targetQuantity: new Prisma.Decimal(dn.targetQuantity),
              notes: dn.notes?.trim(),
            },
          });
        }
      }

      // Cập nhật thông tin cơ bản của Event
      await this.repository.update(
        id,
        {
          title: dto.title?.trim(),
          description:
            dto.description !== undefined ? dto.description?.trim() : undefined,
          location: dto.location?.trim(),
          contactName: dto.contactName?.trim(),
          contactPhone:
            dto.contactPhone !== undefined
              ? dto.contactPhone?.trim()
              : undefined,
          startDate: dto.startDate ? new Date(dto.startDate) : undefined,
          endDate: end,
        },
        tx,
      );

      return this.repository.findById(id, tx);
    });
  }

  /**
   * US-09: Công bố Chiến dịch (Publish Event) & Thay đổi trạng thái vòng đời
   */
  async changeStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: ChangeEventStatusDto,
  ) {
    const event = await this.repository.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status === dto.status) {
      throw new BadRequestException(`Event is already in status ${dto.status}`);
    }

    // 1. Kiểm tra tính hợp lệ của việc chuyển trạng thái (State Transition)
    if (
      event.status === EventStatus.CLOSED ||
      event.status === EventStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Cannot change status of a closed or cancelled event',
      );
    }

    if (event.status === EventStatus.DRAFT) {
      if (
        dto.status !== EventStatus.PUBLISHED &&
        dto.status !== EventStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'A draft event can only transition to PUBLISHED or CANCELLED',
        );
      }
    } else if (event.status === EventStatus.PUBLISHED) {
      if (
        dto.status !== EventStatus.CLOSED &&
        dto.status !== EventStatus.CANCELLED
      ) {
        throw new BadRequestException(
          'A published event can only transition to CLOSED or CANCELLED',
        );
      }
    }

    // 2. Phân quyền:
    // - Platform Admin có quyền kiểm duyệt (Moderation) các chiến dịch
    // - Organizer chỉ có quyền trên chiến dịch của tổ chức mình
    if (actor.systemRole === SystemRole.ADMIN) {
      if (dto.status === EventStatus.PUBLISHED) {
        const org = await this.prisma.organization.findUnique({
          where: { id: event.organizationId },
        });
        if (!org || org.status !== OrgStatus.APPROVED) {
          throw new ForbiddenException(
            'The organization must be approved before publishing events',
          );
        }
      }
    } else {
      if (dto.status === EventStatus.PUBLISHED) {
        await this.organizationAccessService.requireApprovedOrganizer(
          actor.id,
          event.organizationId,
        );
      } else {
        await this.organizationAccessService.requireOrganizer(
          actor.id,
          event.organizationId,
        );
      }
    }

    // 3. Cập nhật trạng thái và ghi nhận Transparency Audit Log trong cùng 1 transaction
    return this.prisma.$transaction(async (tx) => {
      const updatedEvent = await this.repository.update(
        id,
        { status: dto.status },
        tx,
      );

      await this.transparencyRepo.append(tx, {
        eventId: event.id,
        action: 'EVENT_STATUS_CHANGED',
        entityType: TransparencyEntityType.EVENT,
        entityId: event.id,
        actorId: actor.id,
        oldStatus: event.status,
        newStatus: dto.status,
        details: {
          previousStatus: event.status,
          newStatus: dto.status,
        },
        isPublic:
          dto.status === EventStatus.PUBLISHED ||
          event.status === EventStatus.PUBLISHED,
      });

      return updatedEvent;
    });
  }

  /**
   * Xóa Chiến dịch DRAFT (chỉ cho phép xóa khi còn là nháp)
   */
  async deleteDraft(actor: AuthenticatedUser, id: string) {
    const event = await this.repository.findById(id);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.organizationAccessService.requireOrganizer(
      actor.id,
      event.organizationId,
    );

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException('Only DRAFT events may be deleted');
    }

    const [appCount, donCount, batchCount, tripCount] = await Promise.all([
      this.prisma.volunteerApplication.count({ where: { eventId: id } }),
      this.prisma.donation.count({ where: { eventId: id } }),
      this.prisma.batch.count({ where: { eventId: id } }),
      this.prisma.trip.count({ where: { eventId: id } }),
    ]);

    if (appCount > 0 || donCount > 0 || batchCount > 0 || tripCount > 0) {
      throw new BadRequestException(
        'Cannot delete event with existing applications, donations, batches or trips',
      );
    }

    return this.prisma.$transaction(async (tx) => {
      await this.repository.deleteVolunteerRoles(id, tx);
      await this.repository.deleteDonationNeeds(id, tx);
      await this.repository.delete(id, tx);
      return { id, message: 'Event draft deleted successfully' };
    });
  }

  /**
   * KAN-17 / FR06: Lấy danh mục ItemTypes active
   */
  async getActiveItemTypes() {
    return this.repository.findActiveItemTypes();
  }

  /**
   * KAN-17 / FR06: Lấy danh mục Units active
   */
  async getActiveUnits() {
    return this.repository.findActiveUnits();
  }

  /**
   * KAN-17: Lấy danh sách Donation Needs theo Event ID
   */
  async getDonationNeeds(eventId: string) {
    const event = await this.repository.findById(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }
    return this.repository.findDonationNeedsByEventId(eventId);
  }

  /**
   * KAN-17: Bổ sung Donation Need vào Event DRAFT
   */
  async addDonationNeed(
    actor: AuthenticatedUser,
    eventId: string,
    dto: DonationNeedInputDto,
  ) {
    const event = await this.repository.findById(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.organizationAccessService.requireOrganizer(
      actor.id,
      event.organizationId,
    );

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException(
        'Can only add donation needs to a DRAFT event',
      );
    }

    const [validItems, validUnits] = await Promise.all([
      this.repository.validateItemTypes([dto.itemTypeId]),
      this.repository.validateUnits([dto.unitId]),
    ]);

    if (validItems.length === 0) {
      throw new BadRequestException('Item type is invalid or inactive');
    }
    if (validUnits.length === 0) {
      throw new BadRequestException('Unit is invalid or inactive');
    }

    const existingNeeds =
      await this.repository.findDonationNeedsByEventId(eventId);
    const isDuplicate = existingNeeds.some(
      (n) => n.itemTypeId === dto.itemTypeId && n.unitId === dto.unitId,
    );
    if (isDuplicate) {
      throw new BadRequestException(
        'This item type and unit combination already exists for this event',
      );
    }

    return this.repository.createDonationNeed({
      eventId,
      itemTypeId: dto.itemTypeId,
      unitId: dto.unitId,
      targetQuantity: new Prisma.Decimal(dto.targetQuantity),
      notes: dto.notes?.trim(),
    });
  }

  /**
   * KAN-17: Xóa Donation Need khỏi Event DRAFT
   */
  async removeDonationNeed(
    actor: AuthenticatedUser,
    eventId: string,
    needId: string,
  ) {
    const event = await this.repository.findById(eventId);
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    await this.organizationAccessService.requireOrganizer(
      actor.id,
      event.organizationId,
    );

    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException(
        'Can only remove donation needs from a DRAFT event',
      );
    }

    const need = await this.repository.findDonationNeedById(needId);
    if (!need || need.eventId !== eventId) {
      throw new NotFoundException('Donation need not found for this event');
    }

    const donationCount = await this.prisma.donation.count({
      where: { donationNeedId: needId },
    });
    if (donationCount > 0) {
      throw new BadRequestException(
        'Cannot remove donation need that has existing donations',
      );
    }

    await this.repository.deleteDonationNeed(needId);
    return { id: needId, message: 'Donation need removed successfully' };
  }
}
