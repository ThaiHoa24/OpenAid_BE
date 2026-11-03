import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { ReviewOrganizationDto, SetUserActiveDto } from './dto/index.js';
import { OrgStatus } from '../../common/enums/index.js';

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
}

