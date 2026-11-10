import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/index.js';
import { OrganizationRole, OrgStatus } from '../../common/enums/index.js';

@Injectable()
export class OrganizationsRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.organization.findUnique({
      where: { id },
      include: {
        members: {
          select: {
            userId: true,
            role: true,
            joinedAt: true,
            createdAt: true,
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
                phoneNumber: true,
                avatarUrl: true,
                isActive: true,
              },
            },
          },
        },
      },
    });
  }

  async findUserByEmail(email: string) {
    return this.prisma.user.findFirst({
      where: { email: { equals: email.trim(), mode: 'insensitive' } },
    });
  }

  async findByCode(code: string) {
    return this.prisma.organization.findUnique({
      where: { code },
    });
  }

  async findMany(skip = 0, take = 20) {
    return this.prisma.organization.findMany({
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async createWithOrganizer(dto: CreateOrganizationDto, creatorId: string) {
    return this.prisma.$transaction(async (tx) => {
      const org = await tx.organization.create({
        data: {
          name: dto.name,
          code: dto.code.trim().toUpperCase(),
          description: dto.description,
          email: dto.email.trim().toLowerCase(),
          phoneNumber: dto.phoneNumber,
          address: dto.address,
          status: OrgStatus.PENDING,
          createdById: creatorId,
        },
      });

      await tx.organizationMember.create({
        data: {
          organizationId: org.id,
          userId: creatorId,
          role: OrganizationRole.ORGANIZER,
        },
      });

      return org;
    });
  }

  async update(id: string, data: UpdateOrganizationDto) {
    return this.prisma.organization.update({
      where: { id },
      data: {
        ...data,
        updatedAt: new Date(),
      },
    });
  }

  async addMember(
    organizationId: string,
    userId: string,
    role: OrganizationRole,
  ) {
    return this.prisma.organizationMember.create({
      data: {
        organizationId,
        userId,
        role,
      },
    });
  }

  async findMember(organizationId: string, userId: string) {
    return this.prisma.organizationMember.findUnique({
      where: {
        userId_organizationId: {
          userId,
          organizationId,
        },
      },
    });
  }
}
