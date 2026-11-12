import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import {
  AdminEventQueryDto,
  ModerateEventStatusDto,
  ReviewOrganizationDto,
  SetUserActiveDto,
} from './dto/index.js';
import {
  EventStatus,
  OrgStatus,
  TransparencyEntityType,
} from '../../common/enums/index.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transparencyRepo: TransparencyRepository = new TransparencyRepository(prisma),
  ) {}

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

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.organization.update({
        where: { id },
        data: {
          status: dto.status,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
      });

      await this.transparencyRepo.append(tx, {
        actorId: actor.id,
        action: 'ORGANIZATION_REVIEWED',
        entityType: TransparencyEntityType.ORGANIZATION,
        entityId: org.id,
        oldStatus: org.status,
        newStatus: dto.status,
        details: {
          organizationName: org.name,
          organizationCode: org.code,
          previousStatus: org.status,
          newStatus: dto.status,
          ...(dto.rejectionReason?.trim()
            ? { reason: dto.rejectionReason.trim() }
            : {}),
        },
        isPublic: true,
      });

      return updated;
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
    actor: AuthenticatedUser,
    id: string,
    dto: SetUserActiveDto,
  ) {
    if (actor.id === id && !dto.isActive) {
      throw new BadRequestException(
        'Admin không được tự khóa tài khoản của chính mình',
      );
    }

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

  private normalizeEventStatus(status: string): EventStatus {
    if (status === 'COMPLETED' || status === 'SUSPENDED') {
      return EventStatus.CLOSED;
    }
    return status as EventStatus;
  }

  async getAllEvents(query: AdminEventQueryDto) {
    const where: Prisma.EventWhereInput = {};

    if (query.organizationId) {
      where.organizationId = query.organizationId;
    }

    if (query.status) {
      where.status = this.normalizeEventStatus(query.status);
    }

    if (query.search?.trim()) {
      const term = query.search.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { location: { contains: term, mode: 'insensitive' } },
        { organization: { name: { contains: term, mode: 'insensitive' } } },
      ];
    }

    return this.prisma.event.findMany({
      where,
      skip: query.skip,
      take: query.take,
      orderBy: { createdAt: 'desc' },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            code: true,
            description: true,
            email: true,
            phoneNumber: true,
            address: true,
            status: true,
          },
        },
        createdBy: {
          select: {
            id: true,
            email: true,
            fullName: true,
            phoneNumber: true,
            avatarUrl: true,
            systemRole: true,
            isActive: true,
          },
        },
        volunteerRoles: true,
        donationNeeds: {
          include: {
            itemType: true,
            unit: true,
          },
        },
        _count: {
          select: {
            donations: true,
            volunteerApplications: true,
            trips: true,
          },
        },
      },
    });
  }

  async moderateEventStatus(
    actor: AuthenticatedUser,
    id: string,
    dto: ModerateEventStatusDto,
  ) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: { organization: true },
    });

    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const targetStatus = this.normalizeEventStatus(dto.status);

    if (event.status === targetStatus && dto.status !== 'SUSPENDED') {
      throw new BadRequestException(
        `Event is already in status ${targetStatus}`,
      );
    }

    if (targetStatus === EventStatus.PUBLISHED) {
      if (!event.organization || event.organization.status !== OrgStatus.APPROVED) {
        throw new ForbiddenException(
          'The organization must be approved before publishing events',
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.event.update({
        where: { id },
        data: { status: targetStatus },
        include: {
          organization: {
            select: {
              id: true,
              name: true,
              code: true,
              description: true,
              email: true,
              phoneNumber: true,
              address: true,
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

      await this.transparencyRepo.append(tx, {
        eventId: event.id,
        actorId: actor.id,
        action:
          dto.status === 'SUSPENDED'
            ? 'EVENT_SUSPENDED_BY_ADMIN'
            : 'EVENT_MODERATED_BY_ADMIN',
        entityType: TransparencyEntityType.EVENT,
        entityId: event.id,
        oldStatus: event.status,
        newStatus: targetStatus,
        details: {
          previousStatus: event.status,
          newStatus: targetStatus,
          moderationAction: dto.status,
          ...(dto.reason?.trim() ? { reason: dto.reason.trim() } : {}),
        },
        isPublic: true,
      });

      return updated;
    });
  }
}
