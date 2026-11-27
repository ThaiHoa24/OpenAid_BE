/**
 * Function Calling Tools - Volunteers (Tình nguyện viên)
 */

import { Prisma, VolunteerApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.js';
import { OrganizationAccessService } from '../../organizations/organization-access.service.js';

export interface SearchVolunteerOpportunitiesArgs {
  keyword?: string;
  location?: string;
  eventId?: string;
  roleName?: string;
  hasOpenSlots?: boolean; // default true
  skip?: number;
  take?: number;
}

export interface GetMyVolunteerApplicationsArgs {
  userId: string; // From authenticated user
  status?: string;
  skip?: number;
  take?: number;
}

export interface GetVolunteerApplicationDetailArgs {
  applicationId: string;
  userId?: string;
}

export class VolunteerTools {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAccess: OrganizationAccessService,
  ) {}

  /**
   * Tìm kiếm cơ hội tình nguyện (VolunteerRole còn slot)
   * Public: chỉ Event PUBLISHED
   * Organizer/Admin: có thể lọc thêm
   */
  async searchVolunteerOpportunities(
    args: SearchVolunteerOpportunitiesArgs,
    actor: AuthenticatedUser | null,
  ): Promise<any> {
    const where: Prisma.VolunteerRoleWhereInput = {};

    // Chỉ Event PUBLISHED cho public/user
    if (!actor || actor.systemRole === 'USER') {
      where.event = { status: 'PUBLISHED' };
    }

    // Filter by event
    if (args.eventId) {
      where.eventId = args.eventId;
    }

    // Filter by role name
    if (args.roleName?.trim()) {
      where.name = { contains: args.roleName.trim(), mode: 'insensitive' };
    }

    // Keyword search in event
    if (args.keyword?.trim()) {
      const term = args.keyword.trim();
      where.event = {
        ...(where.event as object),
        OR: [
          { title: { contains: term, mode: 'insensitive' } },
          { location: { contains: term, mode: 'insensitive' } },
          { category: { contains: term, mode: 'insensitive' } },
        ],
      };
    }

    // Location filter
    if (args.location?.trim()) {
      where.event = { ...(where.event as object), location: { contains: args.location.trim(), mode: 'insensitive' } };
    }

    const skip = args.skip ?? 0;
    const take = Math.min(args.take ?? 20, 50);

    const roles = await this.prisma.volunteerRole.findMany({
      where,
      skip,
      take,
      orderBy: { event: { startDate: 'asc' } },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            location: true,
            startDate: true,
            endDate: true,
            status: true,
            category: true,
            organization: { select: { id: true, name: true } },
          },
        },
        _count: {
          select: { applications: { where: { status: 'APPROVED' } } },
        },
        applications: {
          where: { status: 'APPROVED' },
          take: 3,
          select: { user: { select: { fullName: true } } },
        },
      },
    });

    const mapped = roles.map(r => {
      const remaining = Math.max(0, r.quantity - r._count.applications);
      const hasSlots = remaining > 0;

      if (args.hasOpenSlots && !hasSlots) return null;

      return {
        id: r.id,
        name: r.name,
        description: r.description,
        required: r.quantity,
        approved: r._count.applications,
        remainingSlots: remaining,
        event: {
          id: r.event.id,
          title: r.event.title,
          location: r.event.location,
          startDate: r.event.startDate.toISOString(),
          endDate: r.event.endDate?.toISOString(),
          status: r.event.status,
          category: r.event.category,
          organization: r.event.organization,
        },
        recentVolunteers: r.applications.map(a => a.user.fullName),
        applyHref: `/volunteer/apply/${r.event.id}`,
        eventHref: `/events/${r.event.id}`,
      };
    }).filter(Boolean);

    return { count: mapped.length, opportunities: mapped };
  }

  /**
   * Lấy lịch sử đăng ký TNV của user hiện tại
   * Cần authenticated user
   */
  async getMyVolunteerApplications(
    args: GetMyVolunteerApplicationsArgs,
    actor: AuthenticatedUser,
  ): Promise<any> {
    if (actor.id !== args.userId && actor.systemRole !== 'ADMIN') {
      throw new Error('Không có quyền xem đăng ký TNV của người khác');
    }

    const where: Prisma.VolunteerApplicationWhereInput = { userId: args.userId };
    if (args.status) {
      where.status = args.status as VolunteerApplicationStatus;
    }

    const skip = args.skip ?? 0;
    const take = Math.min(args.take ?? 20, 50);

    const [apps, total] = await Promise.all([
      this.prisma.volunteerApplication.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        include: {
          event: {
            select: {
              id: true, title: true, location: true, startDate: true, endDate: true,
              status: true, category: true, organization: { select: { name: true } },
            },
          },
          volunteerRole: { select: { id: true, name: true, description: true } },
          attendance: { select: { checkedInAt: true, checkedOutAt: true, method: true } },
          tripAssignments: {
            include: { trip: { select: { id: true, tripCode: true, status: true, departureDate: true } } },
          },
          reviewedBy: { select: { fullName: true } },
        },
      }),
      this.prisma.volunteerApplication.count({ where }),
    ]);

    const mapped = apps.map(a => ({
      id: a.id,
      status: a.status,
      notes: a.notes,
      rejectionReason: a.rejectionReason,
      reviewedAt: a.reviewedAt?.toISOString(),
      reviewedBy: a.reviewedBy?.fullName,
      event: {
        id: a.event.id,
        title: a.event.title,
        location: a.event.location,
        startDate: a.event.startDate.toISOString(),
        endDate: a.event.endDate?.toISOString(),
        status: a.event.status,
        category: a.event.category,
        organization: a.event.organization,
      },
      role: {
        id: a.volunteerRole.id,
        name: a.volunteerRole.name,
        description: a.volunteerRole.description,
      },
      attendance: a.attendance ? {
        checkedInAt: a.attendance.checkedInAt.toISOString(),
        checkedOutAt: a.attendance.checkedOutAt?.toISOString(),
        method: a.attendance.method,
        durationHours: a.attendance.checkedOutAt
          ? (a.attendance.checkedOutAt.getTime() - a.attendance.checkedInAt.getTime()) / 3.6e6
          : null,
      } : null,
      trips: a.tripAssignments.map(ta => ({
        tripCode: ta.trip.tripCode,
        status: ta.trip.status,
        departureDate: ta.trip.departureDate.toISOString(),
        role: ta.role,
      })),
      createdAt: a.createdAt.toISOString(),
      activityHref: `/my/activities`,
      eventHref: `/events/${a.event.id}`,
    }));

    return { count: total, applications: mapped };
  }

  /**
   * Chi tiết đơn đăng ký TNV
   */
  async getVolunteerApplicationDetail(
    args: GetVolunteerApplicationDetailArgs,
    actor: AuthenticatedUser | null,
  ): Promise<any> {
    const app = await this.prisma.volunteerApplication.findUnique({
      where: { id: args.applicationId },
      include: {
        event: { include: { organization: true } },
        volunteerRole: true,
        user: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
        attendance: true,
        tripAssignments: {
          include: { trip: { select: { id: true, tripCode: true, status: true, departureDate: true, departurePoint: true } } },
        },
        reviewedBy: { select: { fullName: true } },
      },
    });

    if (!app) {
      throw new Error(`Không tìm thấy đơn đăng ký: ${args.applicationId}`);
    }

    // Auth check
    if (app.userId !== (actor?.id || '') && actor?.systemRole !== 'ADMIN') {
      if (actor) {
        await this.orgAccess.requireEventOrganizer(actor.id, app.eventId);
      } else {
        throw new Error('Cần đăng nhập để xem chi tiết');
      }
    }

    return {
      id: app.id,
      status: app.status,
      notes: app.notes,
      rejectionReason: app.rejectionReason,
      reviewedAt: app.reviewedAt?.toISOString(),
      reviewedBy: app.reviewedBy?.fullName,
      event: app.event,
      role: app.volunteerRole,
      user: app.user,
      attendance: app.attendance ? {
        checkedInAt: app.attendance.checkedInAt.toISOString(),
        checkedOutAt: app.attendance.checkedOutAt?.toISOString(),
        method: app.attendance.method,
      } : null,
      trips: app.tripAssignments.map(ta => ({
        id: ta.trip.id,
        tripCode: ta.trip.tripCode,
        status: ta.trip.status,
        departureDate: ta.trip.departureDate.toISOString(),
        departurePoint: ta.trip.departurePoint,
        role: ta.role,
      })),
      createdAt: app.createdAt.toISOString(),
      updatedAt: app.updatedAt.toISOString(),
    };
  }
}