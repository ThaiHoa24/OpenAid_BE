/**
 * Function Calling Tools - Organizations (Tổ chức)
 */

import { Prisma, OrgStatus, OrganizationRole } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.js';
import { OrganizationAccessService } from '../../organizations/organization-access.service.js';

export interface GetOrganizationInfoArgs {
  organizationId?: string;
  code?: string;
  userId?: string; // For "my organization"
}

export interface GetMyOrganizationsArgs {
  userId: string;
}

export class OrganizationTools {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAccess: OrganizationAccessService,
  ) {}

  /**
   * Thông tin tổ chức (public info + private nếu có quyền)
   */
  async getOrganizationInfo(args: GetOrganizationInfoArgs, actor: AuthenticatedUser | null): Promise<any> {
    let where: Prisma.OrganizationWhereInput = {};

    if (args.organizationId) {
      where.id = args.organizationId;
    } else if (args.code) {
      where.code = args.code;
    } else if (args.userId) {
      // Get user's primary organization (where they are ORGANIZER)
      const membership = await this.prisma.organizationMember.findFirst({
        where: { userId: args.userId, role: OrganizationRole.ORGANIZER },
        select: { organizationId: true },
      });
      if (!membership) throw new Error('Bạn không phải Organizer của tổ chức nào');
      where.id = membership.organizationId;
    } else {
      throw new Error('Cần cung cấp organizationId, code, hoặc userId');
    }

    const org = await this.prisma.organization.findFirst({
      where,
      include: {
        createdBy: { select: { id: true, fullName: true, email: true } },
        reviewedBy: { select: { fullName: true } },
        members: {
          include: { user: { select: { id: true, fullName: true, email: true, phoneNumber: true } } },
        },
        _count: { select: { events: true, members: true } },
      },
    });

    if (!org) throw new Error('Không tìm thấy tổ chức');

    // Public info always available
    const publicInfo = {
      id: org.id,
      code: org.code,
      name: org.name,
      description: org.description,
      email: org.email,
      phoneNumber: org.phoneNumber,
      address: org.address,
      status: org.status,
      createdAt: org.createdAt.toISOString(),
      createdBy: org.createdBy,
      stats: { eventCount: org._count.events, memberCount: org._count.members },
      href: `/organizer/organization`,
    };

    // Private info requires Organizer/Admin
    const isOrganizer = actor && org.members.some(m => m.userId === actor.id && m.role === OrganizationRole.ORGANIZER);
    const isAdmin = actor?.systemRole === 'ADMIN';

    if (!isOrganizer && !isAdmin) {
      return { ...publicInfo, isPublic: true };
    }

    return {
      ...publicInfo,
      reviewedBy: org.reviewedBy,
      reviewedAt: org.reviewedAt?.toISOString(),
      rejectionReason: org.rejectionReason,
      members: org.members.map(m => ({
        userId: m.user.id,
        fullName: m.user.fullName,
        email: m.user.email,
        phoneNumber: m.user.phoneNumber,
        role: m.role,
        joinedAt: m.createdAt.toISOString(),
      })),
      isPublic: false,
    };
  }

  /**
   * Danh sách tổ chức của user (where they are member)
   */
  async getMyOrganizations(args: GetMyOrganizationsArgs, actor: AuthenticatedUser): Promise<any> {
    if (actor.id !== args.userId && actor.systemRole !== 'ADMIN') {
      throw new Error('Không có quyền');
    }

    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: args.userId },
      include: {
        organization: {
          include: { createdBy: { select: { fullName: true } }, _count: { select: { events: true } } },
        },
      },
    });

    return {
      count: memberships.length,
      organizations: memberships.map(m => ({
        id: m.organization.id,
        code: m.organization.code,
        name: m.organization.name,
        status: m.organization.status,
        role: m.role,
        eventCount: m.organization._count.events,
        createdAt: m.organization.createdAt.toISOString(),
        joinedAt: m.createdAt.toISOString(),
        isPrimary: m.role === OrganizationRole.ORGANIZER,
        href: `/organizer/organization`,
      })),
    };
  }
}