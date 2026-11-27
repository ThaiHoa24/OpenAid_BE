/**
 * Function Calling Tools - Batches (Lô hàng)
 */

import { Prisma, BatchStatus } from '@prisma/client';
import { PrismaService } from '../../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../../common/types/authenticated-user.js';
import { OrganizationAccessService } from '../../organizations/organization-access.service.js';

export interface GetBatchDetailArgs {
  batchId: string;
  userId?: string;
}

export interface GetBatchesByEventArgs {
  eventId: string;
  status?: string;
  userId?: string;
}

export class BatchTools {
  constructor(
    private readonly prisma: PrismaService,
    private readonly orgAccess: OrganizationAccessService,
  ) {}

  /**
   * Chi tiết lô hàng (Batch)
   * Cần Organizer/Admin của Event
   */
  async getBatchDetail(args: GetBatchDetailArgs, actor: AuthenticatedUser | null): Promise<any> {
    const batch = await this.prisma.batch.findUnique({
      where: { id: args.batchId },
      include: {
        event: { include: { organization: true } },
        itemType: true,
        unit: true,
        createdBy: { select: { id: true, fullName: true } },
        inventory: true,
        donations: {
          select: {
            id: true, trackingId: true, status: true, quantity: true, receivedQuantity: true,
            donor: { select: { fullName: true } }, createdAt: true,
          },
        },
        assignments: {
          include: { trip: { select: { id: true, tripCode: true, status: true, departureDate: true } } },
        },
      },
    });

    if (!batch) {
      throw new Error(`Không tìm thấy lô hàng: ${args.batchId}`);
    }

    // Auth check
    if (actor?.systemRole !== 'ADMIN') {
      if (!actor) throw new Error('Cần đăng nhập để xem chi tiết lô hàng');
      await this.orgAccess.requireEventOrganizer(actor.id, batch.eventId);
    }

    // Query transparency logs separately (Batch doesn't have direct relation)
    const transparencyLogs = await this.prisma.transparencyLog.findMany({
      where: { entityType: 'BATCH', entityId: batch.id, isPublic: true },
      orderBy: { createdAt: 'asc' },
      take: 20,
      include: { actor: { select: { fullName: true, systemRole: true } } },
    });

    const totalDonated = batch.donations.reduce((s: number, d: any) => s + Number(d.quantity), 0);
    const distributedQty = Number(batch.quantity) - Number(batch.returnedQuantity) - Number(batch.lostQuantity);

    return {
      id: batch.id,
      batchCode: batch.batchCode,
      status: batch.status,
      event: { id: batch.event.id, title: batch.event.title, location: batch.event.location },
      item: `${Number(batch.quantity)} ${batch.unit.name} ${batch.itemType.name}`,
      itemType: batch.itemType,
      unit: batch.unit,
      quantity: Number(batch.quantity),
      returnedQuantity: Number(batch.returnedQuantity),
      lostQuantity: Number(batch.lostQuantity),
      distributedQuantity: distributedQty,
      reconciliationNote: batch.reconciliationNote,
      inventory: batch.inventory ? {
        receivedQuantity: Number(batch.inventory.receivedQuantity),
        availableQuantity: Number(batch.inventory.availableQuantity),
        reservedQuantity: Number(batch.inventory.reservedQuantity),
        distributedQuantity: Number(batch.inventory.distributedQuantity),
        lostQuantity: Number(batch.inventory.lostQuantity),
      } : null,
      donations: batch.donations.map((d: any) => ({
        trackingId: d.trackingId,
        status: d.status,
        quantity: Number(d.quantity),
        receivedQuantity: Number(d.receivedQuantity),
        donor: d.donor.fullName,
        createdAt: d.createdAt.toISOString(),
      })),
      trips: batch.assignments.map((a: any) => ({
        tripCode: a.trip.tripCode,
        status: a.trip.status,
        departureDate: a.trip.departureDate.toISOString(),
      })),
      timeline: transparencyLogs.map((l: any) => ({
        timestamp: l.createdAt.toISOString(),
        actor: l.actor.fullName,
        actorRole: l.actor.systemRole,
        action: l.action,
        description: typeof l.details === 'object' && l.details && 'description' in l.details
          ? String((l.details as Record<string, unknown>).description)
          : l.action,
      })),
      createdAt: batch.createdAt.toISOString(),
      updatedAt: batch.updatedAt.toISOString(),
      createdBy: batch.createdBy,
      batchHref: `/organizer/batches/${batch.id}`,
    };
  }

  /**
   * Danh sách Batch của Event (Organizer/Admin)
   */
  async getBatchesByEvent(args: GetBatchesByEventArgs, actor: AuthenticatedUser | null): Promise<any> {
    // Verify event exists
    const event = await this.prisma.event.findUnique({
      where: { id: args.eventId },
      select: { id: true, title: true, organizationId: true },
    });

    if (!event) throw new Error(`Không tìm thấy Event: ${args.eventId}`);

    // Auth check
    if (actor?.systemRole !== 'ADMIN') {
      if (!actor) throw new Error('Cần đăng nhập');
      await this.orgAccess.requireEventOrganizer(actor.id, args.eventId);
    }

    const where: Prisma.BatchWhereInput = { eventId: args.eventId };
    if (args.status) where.status = args.status as BatchStatus;

    const batches = await this.prisma.batch.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        itemType: true,
        unit: true,
        _count: { select: { donations: true, assignments: true } },
        assignments: { include: { trip: { select: { tripCode: true, status: true } } } },
      },
    });

    const mapped = batches.map(b => ({
      id: b.id,
      batchCode: b.batchCode,
      status: b.status,
      item: `${Number(b.quantity)} ${b.unit.name} ${b.itemType.name}`,
      quantity: Number(b.quantity),
      returnedQuantity: Number(b.returnedQuantity),
      lostQuantity: Number(b.lostQuantity),
      distributedQuantity: Number(b.quantity) - Number(b.returnedQuantity) - Number(b.lostQuantity),
      donationCount: b._count.donations,
      tripCount: b._count.assignments,
      tripCodes: b.assignments.map(a => a.trip.tripCode),
      createdAt: b.createdAt.toISOString(),
      batchHref: `/organizer/batches/${b.id}`,
    }));

    return { count: mapped.length, batches: mapped };
  }
}