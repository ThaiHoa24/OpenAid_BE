import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { ReviewOrganizationDto, SetUserActiveDto } from './dto/index.js';
import {
  OrgStatus,
  TransparencyEntityType,
} from '../../common/enums/index.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';

@Injectable()
export class AdminService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly transparencyRepo: TransparencyRepository,
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
        entityId: id,
        oldStatus: org.status,
        newStatus: dto.status,
        details: {
          organizationName: org.name,
          organizationCode: org.code,
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

  async getAllEvents(query: PaginationDto) {
    return this.prisma.event.findMany({
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
}
