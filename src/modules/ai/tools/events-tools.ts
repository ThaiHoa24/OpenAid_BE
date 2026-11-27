/**
 * Function Calling Tools - Events (Chiến dịch)
 */

import { Prisma, EventStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.js';
import { OrganizationAccessService } from '../../organizations/organization-access.service.js';
import { TransparencyRepository } from '../../transparency/transparency.repository.js';

export interface SearchEventsArgs {
  keyword?: string;
  location?: string;
  category?: string;
  status?: string; // PUBLISHED, CLOSED, ALL (Organizer/Admin)
  itemTypeId?: string;
  from?: string; // ISO date
  to?: string;   // ISO date
  skip?: number;
  take?: number;
}

export interface GetEventDetailArgs {
  eventId: string;
}

export interface GetEventStatusArgs {
  eventId: string;
}

export class EventsTools {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAccess: OrganizationAccessService,
    private readonly transparencyRepo: TransparencyRepository,
  ) {}

  /**
   * Tìm kiếm chiến dịch (Event)
   * - Guest/User: chỉ PUBLISHED (mặc định)
   * - Organizer: có thể lọc status, organizationId
   * - Admin: mọi thứ
   */
  async searchEvents(
    args: SearchEventsArgs,
    actor: AuthenticatedUser | null, // null = guest
  ): Promise<{ count: number; events: any[] }> {
    const where: Prisma.EventWhereInput = {};

    // Xử lý status theo quyền
    const requestedStatus = args.status?.toUpperCase();
    if (actor?.systemRole === 'ADMIN') {
      // Admin: respect requested status or default PUBLISHED
      where.status = requestedStatus && requestedStatus !== 'ALL' ? requestedStatus as EventStatus : EventStatus.PUBLISHED;
    } else if (actor && actor.systemRole === 'USER') {
      // User đã đăng nhập nhưng không phải Organizer/Admin: chỉ PUBLISHED
      where.status = EventStatus.PUBLISHED;
    } else {
      // Guest: chỉ PUBLISHED
      where.status = EventStatus.PUBLISHED;
    }

    // Keyword search
    if (args.keyword?.trim()) {
      const term = args.keyword.trim();
      where.OR = [
        { title: { contains: term, mode: 'insensitive' } },
        { description: { contains: term, mode: 'insensitive' } },
        { location: { contains: term, mode: 'insensitive' } },
        { category: { contains: term, mode: 'insensitive' } },
      ];
    }

    // Location filter
    if (args.location?.trim()) {
      where.location = { contains: args.location.trim(), mode: 'insensitive' };
    }

    // Category filter
    if (args.category?.trim()) {
      where.category = { equals: args.category.trim(), mode: 'insensitive' };
    }

    // ItemType filter (through DonationNeed)
    if (args.itemTypeId) {
      where.donationNeeds = { some: { itemTypeId: args.itemTypeId } };
    }

    // Date range
    if (args.from || args.to) {
      where.startDate = {};
      if (args.from) where.startDate.gte = new Date(args.from);
      if (args.to) where.startDate.lte = new Date(args.to);
    }

    // Organization filter (only for Organizer/Admin)
    if (args.skip === undefined && args.take === undefined && actor && actor.systemRole !== 'ADMIN') {
      // Nếu là Organizer, chỉ xem Event của org mình (mặc định)
      // TODO: Cần lấy organizationId từ memberships
    }

    const skip = args.skip ?? 0;
    const take = Math.min(args.take ?? 10, 20);

    const [events, total] = await Promise.all([
      this.prisma.event.findMany({
        where,
        skip,
        take,
        orderBy: { startDate: 'desc' },
        select: {
          id: true,
          title: true,
          description: true,
          location: true,
          category: true,
          startDate: true,
          endDate: true,
          status: true,
          organization: { select: { id: true, name: true, code: true } },
          createdBy: { select: { id: true, fullName: true } },
          donationNeeds: {
            select: {
              id: true,
              targetQuantity: true,
              itemType: { select: { id: true, name: true, category: true } },
              unit: { select: { id: true, name: true, code: true } },
              donations: {
                where: { status: { in: ['RECEIVED', 'IN_BATCH', 'DISTRIBUTED'] } },
                select: { receivedQuantity: true },
              },
            },
          },
          volunteerRoles: {
            select: {
              id: true,
              name: true,
              quantity: true,
              description: true,
              _count: {
                select: { applications: { where: { status: 'APPROVED' } } },
              },
            },
          },
          _count: {
            select: { donations: true, volunteerApplications: true },
          },
        },
      }),
      this.prisma.event.count({ where }),
    ]);

    const now = new Date();
    const mapped = events.map((ev, index) => {
      const needs = ev.donationNeeds.map((n) => {
        const target = Number(n.targetQuantity);
        const received = n.donations.reduce((sum, d) => sum + Number(d.receivedQuantity), 0);
        const remaining = Math.max(0, target - received);
        const fillRatio = target > 0 ? received / target : 1;
        return {
          id: n.id,
          item: n.itemType.name,
          itemCategory: n.itemType.category,
          unit: n.unit.name,
          target,
          received,
          remaining,
          fillRatio,
        };
      });

      const totalTarget = needs.reduce((sum, n) => sum + n.target, 0);
      const totalReceived = needs.reduce((sum, n) => sum + n.received, 0);
      const overallFillRatio = totalTarget > 0 ? totalReceived / totalTarget : 1;

      let statusLabel: 'Đang diễn ra' | 'Sắp diễn ra' | 'Cần hỗ trợ gấp' | 'Đã kết thúc' | 'Đã huỷ' = 'Đang diễn ra';
      if (ev.status === EventStatus.CLOSED) statusLabel = 'Đã kết thúc';
      else if (ev.status === EventStatus.CANCELLED) statusLabel = 'Đã huỷ';
      else if (ev.startDate > now) statusLabel = 'Sắp diễn ra';
      else if (overallFillRatio < 0.4) statusLabel = 'Cần hỗ trợ gấp';

      const dateRange = ev.endDate
        ? `${this.formatDateVi(ev.startDate)} - ${this.formatDateVi(ev.endDate)}`
        : `Từ ${this.formatDateVi(ev.startDate)}`;

      const topNeeds = needs
        .filter(n => n.remaining > 0)
        .slice(0, 3)
        .map(n => `${n.item} (thiếu ${n.remaining} ${n.unit})`)
        .join(', ');

      return {
        id: ev.id,
        title: ev.title,
        description: ev.description,
        location: ev.location,
        category: ev.category || 'Cứu trợ hiện vật',
        dateRange,
        startDate: ev.startDate.toISOString(),
        endDate: ev.endDate?.toISOString(),
        status: ev.status,
        statusLabel,
        organization: ev.organization,
        fillRatio: overallFillRatio,
        needsSummary: topNeeds || (needs.length > 0 ? 'Đã đáp ứng đủ nhu cầu' : 'Chưa cấu hình nhu cầu'),
        needs,
        volunteerRoles: ev.volunteerRoles.map(r => ({
          id: r.id,
          name: r.name,
          description: r.description,
          required: r.quantity,
          approved: r._count.applications,
          remainingSlots: Math.max(0, r.quantity - r._count.applications),
        })),
        stats: {
          totalDonations: ev._count.donations,
          totalVolunteers: ev._count.volunteerApplications,
        },
        href: `/events/${ev.id}`,
      };
    });

    return { count: total, events: mapped };
  }

  /**
   * Xem chi tiết chiến dịch
   */
  async getEventDetail(args: GetEventDetailArgs, actor: AuthenticatedUser | null): Promise<any> {
    const event = await this.prisma.event.findUnique({
      where: { id: args.eventId },
      include: {
        organization: true,
        createdBy: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
        donationNeeds: {
          include: {
            itemType: true,
            unit: true,
            donations: {
              where: { status: { in: ['RECEIVED', 'IN_BATCH', 'DISTRIBUTED'] } },
              select: { receivedQuantity: true },
            },
          },
        },
        volunteerRoles: {
          include: {
            _count: { select: { applications: { where: { status: 'APPROVED' } } } },
            applications: {
              where: { status: 'APPROVED' },
              take: 5,
              select: { id: true, user: { select: { fullName: true } }, notes: true },
            },
          },
        },
        _count: {
          select: { donations: true, volunteerApplications: true, batches: true, trips: true },
        },
      },
    });

    if (!event) {
      throw new Error(`Không tìm thấy chiến dịch với ID: ${args.eventId}`);
    }

    // Check permission for non-PUBLISHED events
    if (event.status !== EventStatus.PUBLISHED) {
      if (!actor) throw new Error('Chiến dịch này không công khai. Vui lòng đăng nhập.');
      if (actor.systemRole !== 'ADMIN') {
        await this.orgAccess.requireEventOrganizer(actor.id, event.id);
      }
    }

    const now = new Date();
    const needs = event.donationNeeds.map((n: any) => {
      const target = Number(n.targetQuantity);
      const received = n.donations.reduce((sum: number, d: any) => sum + Number(d.receivedQuantity), 0);
      const remaining = Math.max(0, target - received);
      return {
        id: n.id,
        item: n.itemType.name,
        itemCategory: n.itemType.category,
        unit: n.unit.name,
        target,
        received,
        remaining,
        fillRatio: target > 0 ? received / target : 1,
        notes: n.notes,
      };
    });

    const totalTarget = needs.reduce((sum: number, n: any) => sum + n.target, 0);
    const totalReceived = needs.reduce((sum: number, n: any) => sum + n.received, 0);
    const overallFillRatio = totalTarget > 0 ? totalReceived / totalTarget : 1;

    let statusLabel: string = event.status;
    if (event.status === EventStatus.PUBLISHED) {
      if (event.startDate > now) statusLabel = 'Sắp diễn ra';
      else if (overallFillRatio < 0.4) statusLabel = 'Cần hỗ trợ gấp';
      else statusLabel = 'Đang diễn ra';
    } else if (event.status === EventStatus.CLOSED) statusLabel = 'Đã kết thúc';
    else if (event.status === EventStatus.CANCELLED) statusLabel = 'Đã huỷ';
    else if (event.status === EventStatus.DRAFT) statusLabel = 'Nháp (chỉ Organizer/Admin xem)';

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      location: event.location,
      contactName: event.contactName,
      contactPhone: event.contactPhone,
      category: event.category,
      startDate: event.startDate.toISOString(),
      endDate: event.endDate?.toISOString(),
      status: event.status,
      statusLabel,
      organization: event.organization,
      createdBy: event.createdBy,
      createdAt: event.createdAt.toISOString(),
      updatedAt: event.updatedAt.toISOString(),
      needs,
      volunteerRoles: event.volunteerRoles.map((r: any) => ({
        id: r.id,
        name: r.name,
        description: r.description,
        required: r.quantity,
        approved: r._count.applications,
        remainingSlots: Math.max(0, r.quantity - r._count.applications),
        recentVolunteers: r.applications.map((a: any) => ({ name: a.user.fullName, notes: a.notes })),
      })),
      overallProgress: {
        totalTarget,
        totalReceived,
        fillRatio: overallFillRatio,
        statusLabel,
      },
      stats: event._count,
      href: `/events/${event.id}`,
      donateHref: `/donate/${event.id}`,
      volunteerHref: `/volunteer/apply/${event.id}`,
      trackHref: `/track`,
    };
  }

  /**
   * Lấy trạng thái nhanh của chiến dịch (dùng cho follow-up questions)
   */
  async getEventStatus(args: GetEventStatusArgs, actor: AuthenticatedUser | null): Promise<any> {
    const event = await this.prisma.event.findUnique({
      where: { id: args.eventId },
      select: {
        id: true,
        title: true,
        status: true,
        startDate: true,
        endDate: true,
        location: true,
        donationNeeds: {
          select: {
            targetQuantity: true,
            itemType: { select: { name: true } },
            unit: { select: { name: true } },
            donations: {
              where: { status: { in: ['RECEIVED', 'IN_BATCH', 'DISTRIBUTED'] } },
              select: { receivedQuantity: true },
            },
          },
        },
        volunteerRoles: {
          select: {
            quantity: true,
            _count: { select: { applications: { where: { status: 'APPROVED' } } } },
          },
        },
      },
    });

    if (!event) {
      throw new Error(`Không tìm thấy chiến dịch: ${args.eventId}`);
    }

    const now = new Date();
    const needs = event.donationNeeds.map((n: any) => {
      const target = Number(n.targetQuantity);
      const received = n.donations.reduce((s: number, d: any) => s + Number(d.receivedQuantity), 0);
      return { item: n.itemType.name, unit: n.unit.name, target, received, remaining: Math.max(0, target - received) };
    });

    const totalTarget = needs.reduce((s: number, n: any) => s + n.target, 0);
    const totalReceived = needs.reduce((s: number, n: any) => s + n.received, 0);
    const fillRatio = totalTarget > 0 ? totalReceived / totalTarget : 1;

    let statusLabel: string = event.status;
    if (event.status === EventStatus.PUBLISHED) {
      if (event.startDate > now) statusLabel = 'Sắp diễn ra';
      else if (fillRatio < 0.4) statusLabel = 'Cần hỗ trợ gấp';
      else statusLabel = 'Đang diễn ra';
    } else if (event.status === EventStatus.CLOSED) statusLabel = 'Đã kết thúc';
    else if (event.status === EventStatus.CANCELLED) statusLabel = 'Đã huỷ';

    return {
      id: event.id,
      title: event.title,
      status: event.status,
      statusLabel,
      location: event.location,
      dateRange: event.endDate
        ? `${this.formatDateVi(event.startDate)} - ${this.formatDateVi(event.endDate)}`
        : `Từ ${this.formatDateVi(event.startDate)}`,
      overallFillRatio: fillRatio,
      needs: needs.map((n: any) => `${n.item}: ${n.received}/${n.target} ${n.unit} (${n.remaining > 0 ? `còn thiếu ${n.remaining}` : 'đủ'})`),
      volunteerSlots: event.volunteerRoles.map((r: any) => `${r._count.applications}/${r.quantity}`),
      isActive: event.status === EventStatus.PUBLISHED && event.startDate <= now,
    };
  }

  private formatDateVi(date: Date): string {
    return date.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  }
}