import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import {
  AdminEventQueryDto,
  AdminModerateEventDto,
  ReviewOrganizationDto,
  SetUserActiveDto,
} from './dto/index.js';
import {
  EventStatus,
  OrgStatus,
  TransparencyEntityType,
} from '../../common/enums/index.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPendingOrganizations(query: PaginationDto) {
    return this.prisma.organization.findMany({
      where: { status: OrgStatus.PENDING },
      skip: query.skip,
      take: query.take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async reviewOrganization(
    actor: AuthenticatedUser,
    id: string,
    dto: ReviewOrganizationDto,
  ) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException('Organization not found');
    }

    return this.prisma.organization.update({
      where: { id },
      data: {
        status: dto.status,
        reviewedById: actor.id,
        reviewedAt: new Date(),
      },
    });
  }

  async getAllUsers(query: PaginationDto) {
    return this.prisma.user.findMany({
      skip: query.skip,
      take: query.take,
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        systemRole: true,
        isActive: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async toggleUserActive(
    _actor: AuthenticatedUser,
    id: string,
    dto: SetUserActiveDto,
  ) {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id },
      data: { isActive: dto.isActive },
      select: {
        id: true,
        email: true,
        fullName: true,
        isActive: true,
        systemRole: true,
      },
    });
  }

  /**
   * ADM-05: Quản trị danh sách chiến dịch hệ thống
   * Cho phép Admin xem toàn bộ sự kiện cứu trợ với phân trang, tìm kiếm từ khóa và bộ lọc tổ chức, trạng thái.
   */
  async getAdminEvents(query: AdminEventQueryDto) {
    const page =
      query.page ??
      (query.skip !== undefined
        ? Math.floor(query.skip / (query.take ?? 20)) + 1
        : 1);
    const limit = query.limit ?? query.take ?? 20;
    const skip = (page - 1) * limit;
    const take = limit;

    const where: Prisma.EventWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.organizationId) {
      where.organizationId = query.organizationId;
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { location: { contains: term, mode: 'insensitive' } },
        { contactName: { contains: term, mode: 'insensitive' } },
        { organization: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    const [total, events] = await Promise.all([
      this.prisma.event.count({ where }),
      this.prisma.event.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
              email: true,
              phoneNumber: true,
            },
          },
          volunteerRoles: {
            select: {
              id: true,
              name: true,
              quantity: true,
              description: true,
            },
          },
          donationNeeds: {
            include: {
              itemType: true,
              unit: true,
            },
          },
          _count: {
            select: {
              donations: true,
              trips: true,
              volunteerApplications: true,
            },
          },
        },
      }),
    ]);

    const items = events.map((ev) => {
      const totalRequiredVolunteers = ev.volunteerRoles.reduce(
        (sum, r) => sum + r.quantity,
        0,
      );
      return {
        ...ev,
        donationsCount: ev._count.donations,
        tripsCount: ev._count.trips,
        applicationsCount: ev._count.volunteerApplications,
        totalRequiredVolunteers,
      };
    });

    return {
      items,
      total,
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    };
  }

  /**
   * ADM-06: Kiểm duyệt sự kiện cấp hệ thống (Event Moderation)
   * Can thiệp cập nhật trạng thái sự kiện sang SUSPENDED hoặc CANCELLED kèm lý do và ghi audit log.
   */
  async moderateEventStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: AdminModerateEventDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (
      dto.status !== EventStatus.SUSPENDED &&
      dto.status !== EventStatus.CANCELLED
    ) {
      throw new BadRequestException(
        'Admin moderation status must be either SUSPENDED or CANCELLED',
      );
    }

    if (event.status === dto.status) {
      throw new BadRequestException(
        `Event is already in status ${dto.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.event.update({
        where: { id },
        data: {
          status: dto.status,
          ...(dto.reason !== undefined
            ? { moderationReason: dto.reason.trim() }
            : {}),
        },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              code: true,
              status: true,
            },
          },
          volunteerRoles: true,
          donationNeeds: {
            include: {
              itemType: true,
              unit: true,
            },
          },
        },
      });

      await tx.transparencyLog.create({
        data: {
          eventId: event.id,
          action: 'EVENT_MODERATED',
          entityType: TransparencyEntityType.EVENT,
          entityId: event.id,
          actorId: actor.id,
          oldStatus: event.status,
          newStatus: dto.status,
          details: {
            previousStatus: event.status,
            newStatus: dto.status,
            reason: dto.reason?.trim() ?? 'No reason provided',
            moderatedBy: actor.email,
            moderatedAt: new Date().toISOString(),
          },
          isPublic: true,
        },
      });

      return updated;
    });
  }
}
