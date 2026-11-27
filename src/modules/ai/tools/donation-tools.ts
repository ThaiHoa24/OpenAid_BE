/**
 * Function Calling Tools - Donations (Quyên góp)
 */

import { Prisma, DonationStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.js';
import { OrganizationAccessService } from '../../organizations/organization-access.service.js';

export interface GetMyDonationsArgs {
  userId: string; // Lấy từ authenticated user
  skip?: number;
  take?: number;
  status?: string;
}

export interface TrackDonationArgs {
  trackingId: string;
}

export interface GetDonationDetailArgs {
  donationId: string;
  userId?: string; // For authorization
}

export class DonationTools {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAccess: OrganizationAccessService,
  ) {}

  /**
   * Lấy lịch sử quyên góp của user hiện tại
   * Cần authenticated user
   */
  async getMyDonations(args: GetMyDonationsArgs, actor: AuthenticatedUser): Promise<any> {
    // Verify actor owns this data
    if (actor.id !== args.userId && actor.systemRole !== 'ADMIN') {
      throw new Error('Không có quyền xem lịch sử quyên góp của người khác');
    }

    const where: Prisma.DonationWhereInput = { donorId: args.userId };
    if (args.status) {
      where.status = args.status as DonationStatus;
    }

    const skip = args.skip ?? 0;
    const take = Math.min(args.take ?? 20, 50);

    const [donations, total] = await Promise.all([
      this.prisma.donation.findMany({
        where,
        skip,
        take,
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          trackingId: true,
          status: true,
          quantity: true,
          receivedQuantity: true,
          photoUrl: true,
          rejectionReason: true,
          createdAt: true,
          receivedAt: true,
          event: { select: { id: true, title: true, location: true, status: true } },
          itemType: { select: { id: true, name: true, category: true } },
          unit: { select: { id: true, name: true, code: true } },
          batch: { select: { id: true, batchCode: true, status: true } },
          donationNeed: { select: { id: true, targetQuantity: true } },
        },
      }),
      this.prisma.donation.count({ where }),
    ]);

    const mapped = donations.map(d => ({
      id: d.id,
      trackingId: d.trackingId,
      status: d.status,
      item: `${Number(d.quantity)} ${d.unit.name} ${d.itemType.name}`,
      itemCategory: d.itemType.category,
      quantity: Number(d.quantity),
      receivedQuantity: Number(d.receivedQuantity),
      photoUrl: d.photoUrl,
      rejectionReason: d.rejectionReason,
      event: {
        id: d.event.id,
        title: d.event.title,
        location: d.event.location,
        status: d.event.status,
      },
      batch: d.batch ? { batchCode: d.batch.batchCode, status: d.batch.status } : null,
      createdAt: d.createdAt.toISOString(),
      receivedAt: d.receivedAt?.toISOString(),
      trackingUrl: `/track/${d.trackingId}`,
      donateHref: `/donate/${d.event.id}`,
    }));

    return { count: total, donations: mapped };
  }

  /**
   * Tra cứu đơn quyên góp theo TrackingId (PUBLIC - không cần auth)
   */
  async trackDonation(args: TrackDonationArgs): Promise<any> {
    const trackingId = args.trackingId.trim().toUpperCase();

    const donation = await this.prisma.donation.findUnique({
      where: { trackingId },
      select: {
        id: true,
        trackingId: true,
        status: true,
        quantity: true,
        receivedQuantity: true,
        photoUrl: true,
        notes: true,
        createdAt: true,
        receivedAt: true,
        event: {
          select: { id: true, title: true, location: true, organization: { select: { name: true } } }
        },
        itemType: { select: { name: true, category: true } },
        unit: { select: { name: true, code: true } },
        batch: {
          select: {
            id: true,
            batchCode: true,
            status: true,
            quantity: true,
            returnedQuantity: true,
            lostQuantity: true,
            assignments: {
              select: {
                trip: {
                  select: {
                    id: true,
                    tripCode: true,
                    status: true,
                    departurePoint: true,
                    departureDate: true,
                    completedAt: true,
                    points: {
                      orderBy: { position: 'asc' },
                      select: {
                        id: true,
                        name: true,
                        location: true,
                        status: true,
                        arrivedAt: true,
                        distributedAt: true,
                        records: {
                          select: { distributedQuantity: true, beneficiaryCount: true, confirmedAt: true },
                        },
                        evidence: {
                          where: { reviewStatus: 'APPROVED', privacyConfirmed: true },
                          take: 3,
                          select: { caption: true, imageUrl: true, uploadedAt: true },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!donation) {
      return {
        found: false,
        message: `Không tìm thấy đơn quyên góp nào với mã "${args.trackingId}". Vui lòng kiểm tra lại TrackingId.`,
        suggestion: 'Xem lịch sử quyên góp tại /my/donations hoặc liên hệ Ban Tổ Chức.',
      };
    }

    // Build timeline từ transparency logs (public only)
    const timeline = await this.prisma.transparencyLog.findMany({
      where: {
        isPublic: true,
        OR: [
          { entityId: donation.id },
          ...(donation.batch?.id ? [{ entityId: donation.batch.id }] : []),
          ...(donation.batch?.assignments?.[0]?.trip?.id ? [{ entityId: donation.batch.assignments[0].trip.id }] : []),
          { eventId: donation.event.id },
        ],
      },
      include: {
        actor: { select: { id: true, fullName: true, systemRole: true } },
      },
      orderBy: { createdAt: 'asc' },
    });

    const batch = donation.batch;
    const trip = batch?.assignments?.[0]?.trip as any;

    return {
      found: true,
      donation: {
        trackingId: donation.trackingId,
        status: donation.status,
        item: `${Number(donation.quantity)} ${donation.unit.name} ${donation.itemType.name}`,
        itemCategory: donation.itemType.category,
        quantity: Number(donation.quantity),
        receivedQuantity: Number(donation.receivedQuantity),
        photoUrl: donation.photoUrl,
        notes: donation.notes,
        event: donation.event,
        createdAt: donation.createdAt.toISOString(),
        receivedAt: donation.receivedAt?.toISOString(),
      },
      batch: batch ? {
        id: batch.id,
        batchCode: batch.batchCode,
        status: batch.status,
        totalQuantity: Number(batch.quantity),
        distributedQuantity: Number(batch.quantity) - Number(batch.returnedQuantity) - Number(batch.lostQuantity),
        returnedQuantity: Number(batch.returnedQuantity),
        lostQuantity: Number(batch.lostQuantity),
      } : null,
      trip: trip ? {
        id: trip.id,
        tripCode: trip.tripCode,
        status: trip.status,
        departurePoint: trip.departurePoint,
        departureDate: trip.departureDate.toISOString(),
        completedAt: trip.completedAt?.toISOString(),
      } : null,
      distributionPoints: (trip?.points ?? []).map((p: any) => ({
        id: p.id,
        name: p.name,
        location: p.location,
        status: p.status,
        arrivedAt: p.arrivedAt?.toISOString(),
        distributedAt: p.distributedAt?.toISOString(),
        records: (p.records ?? []).map((r: any) => ({
          distributedQuantity: Number(r.distributedQuantity),
          beneficiaryCount: r.beneficiaryCount,
          confirmedAt: r.confirmedAt.toISOString(),
        })),
        evidence: (p.evidence ?? []).map((e: any) => ({
          caption: e.caption,
          imageUrl: e.imageUrl,
          uploadedAt: e.uploadedAt.toISOString(),
        })),
      })),
      timeline: timeline.map((l: any) => ({
        timestamp: l.createdAt.toISOString(),
        actor: l.actor.fullName,
        actorRole: l.actor.systemRole,
        action: l.action,
        description: typeof l.details === 'object' && l.details && 'description' in l.details
          ? String((l.details as Record<string, unknown>).description)
          : l.action,
        oldStatus: l.oldStatus,
        newStatus: l.newStatus,
      })),
      trackingUrl: `/track/${donation.trackingId}`,
    };
  }

  /**
   * Chi tiết đơn quyên góp (cần auth nếu không phải public tracking)
   */
  async getDonationDetail(args: GetDonationDetailArgs, actor: AuthenticatedUser | null): Promise<any> {
    const donation = await this.prisma.donation.findUnique({
      where: { id: args.donationId },
      include: {
        event: { include: { organization: true } },
        itemType: true,
        unit: true,
        donor: { select: { id: true, fullName: true, email: true, phoneNumber: true } },
        batch: true,
        donationNeed: { include: { itemType: true, unit: true } },
      },
    });

    if (!donation) {
      throw new Error(`Không tìm thấy đơn quyên góp: ${args.donationId}`);
    }

    // Auth check: donor hoặc Organizer/Admin
    if (donation.donorId !== (actor?.id || '') && actor?.systemRole !== 'ADMIN') {
      if (actor) {
        await this.orgAccess.requireEventOrganizer(actor.id, donation.eventId);
      } else {
        throw new Error('Cần đăng nhập để xem chi tiết đơn này');
      }
    }

    const d = donation as any;
    return {
      id: d.id,
      trackingId: d.trackingId,
      status: d.status,
      quantity: Number(d.quantity),
      receivedQuantity: Number(d.receivedQuantity),
      photoUrl: d.photoUrl,
      notes: d.notes,
      rejectionReason: d.rejectionReason,
      event: d.event,
      itemType: d.itemType,
      unit: d.unit,
      donor: d.donor,
      batch: d.batch,
      donationNeed: d.donationNeed,
      createdAt: d.createdAt.toISOString(),
      receivedAt: d.receivedAt?.toISOString(),
      trackingUrl: `/track/${d.trackingId}`,
    };
  }
}