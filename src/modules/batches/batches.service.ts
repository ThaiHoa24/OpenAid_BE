import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma, SystemRole, TransparencyEntityType } from '@prisma/client';
import { BatchesRepository } from './batches.repository.js';
import {
  CreateBatchDto,
  ReconcileBatchDto,
  UpdateBatchDto,
} from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { BatchStatus, DonationStatus } from '../../common/enums/index.js';
import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';

@Injectable()
export class BatchesService {
  constructor(
    private readonly repository: BatchesRepository,
    private readonly prisma: PrismaService,
    private readonly organizationAccessService: OrganizationAccessService,
    private readonly transparencyRepo: TransparencyRepository,
  ) {}

  private generateBatchCode(): string {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    return `BAT-${timestamp}-${random}`;
  }

  async createBatch(actor: AuthenticatedUser, dto: CreateBatchDto) {
    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        dto.eventId,
      );
    }

    const donations = await this.repository.findDonationsByIds(dto.donationIds);
    if (donations.length !== dto.donationIds.length) {
      throw new BadRequestException('One or more donation IDs are invalid');
    }

    const itemTypeId = donations[0].itemTypeId;
    const unitId = donations[0].unitId;

    for (const d of donations) {
      if (d.eventId !== dto.eventId) {
        throw new BadRequestException(
          'All donations in a batch must belong to the specified event',
        );
      }
      if (d.status !== DonationStatus.RECEIVED) {
        throw new BadRequestException(
          `Donation ${d.trackingId} has status ${d.status}. Only RECEIVED donations can be batched.`,
        );
      }
      if (d.itemTypeId !== itemTypeId || d.unitId !== unitId) {
        throw new BadRequestException(
          'All donations in a batch must share the exact same item type and unit',
        );
      }
    }

    const totalQuantity = donations.reduce(
      (sum, d) => sum.plus(d.quantity),
      new Prisma.Decimal(0),
    );

    const inventory = await this.repository.findInventory(
      dto.eventId,
      itemTypeId,
      unitId,
    );

    if (!inventory || inventory.availableQuantity.lessThan(totalQuantity)) {
      throw new BadRequestException(
        `Insufficient available inventory to form batch. Available: ${inventory?.availableQuantity ?? 0}, Required: ${totalQuantity}`,
      );
    }

    const batchCode = this.generateBatchCode();

    return this.prisma.$transaction(async (tx) => {
      const batch = await this.repository.create(
        {
          batchCode,
          eventId: dto.eventId,
          createdById: actor.id,
          inventoryId: inventory.id,
          itemTypeId,
          unitId,
          quantity: totalQuantity,
          status: BatchStatus.DRAFT,
        },
        tx,
      );

      // Link donations to batch and change status to IN_BATCH
      await tx.donation.updateMany({
        where: { id: { in: dto.donationIds } },
        data: {
          batchId: batch.id,
          status: DonationStatus.IN_BATCH,
        },
      });

      // Reserve inventory quantity
      await this.repository.reserveInventory(inventory.id, totalQuantity, tx);

      await this.transparencyRepo.append(tx, {
        eventId: dto.eventId,
        actorId: actor.id,
        action: 'BATCH_CREATED',
        entityType: TransparencyEntityType.BATCH,
        entityId: batch.id,
        newStatus: BatchStatus.DRAFT,
        details: {
          batchCode,
          donationCount: donations.length,
          totalQuantity: totalQuantity.toNumber(),
          itemType: donations[0].itemType.name,
          unit: donations[0].unit.name,
        },
        isPublic: true,
      });

      return batch;
    });
  }

  async getBatchesByEvent(actor: AuthenticatedUser, eventId: string) {
    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        eventId,
      );
    }
    return this.repository.findByEvent(eventId);
  }

  async getBatchById(actor: AuthenticatedUser, id: string) {
    const batch = await this.repository.findById(id);
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        batch.eventId,
      );
    }

    return batch;
  }

  async updateBatch(actor: AuthenticatedUser, id: string, dto: UpdateBatchDto) {
    const batch = await this.repository.findById(id);
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        batch.eventId,
      );
    }

    if (batch.status !== BatchStatus.DRAFT) {
      throw new BadRequestException(
        `Batch status transition to ${dto.status} is only allowed from DRAFT. Current status: ${batch.status}`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repository.update(
        id,
        {
          status: dto.status,
        },
        tx,
      );

      await this.transparencyRepo.append(tx, {
        eventId: batch.eventId,
        actorId: actor.id,
        action: 'BATCH_READY',
        entityType: TransparencyEntityType.BATCH,
        entityId: batch.id,
        oldStatus: BatchStatus.DRAFT,
        newStatus: dto.status,
        details: {
          batchCode: batch.batchCode,
        },
        isPublic: true,
      });

      return updated;
    });
  }

  async reconcileBatch(
    actor: AuthenticatedUser,
    id: string,
    dto: ReconcileBatchDto,
  ) {
    const batch = await this.repository.findById(id);
    if (!batch) {
      throw new NotFoundException('Batch not found');
    }

    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        batch.eventId,
      );
    }

    const retDec = new Prisma.Decimal(dto.returnedQuantity);
    const lostDec = new Prisma.Decimal(dto.lostQuantity);
    const sumRetLost = retDec.plus(lostDec);

    if (sumRetLost.greaterThan(batch.quantity)) {
      throw new BadRequestException(
        `Returned quantity (${dto.returnedQuantity}) + lost quantity (${dto.lostQuantity}) cannot exceed batch total quantity (${batch.quantity})`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repository.update(
        id,
        {
          status: BatchStatus.DISTRIBUTED,
          returnedQuantity: retDec,
          lostQuantity: lostDec,
          reconciliationNote: dto.note.trim(),
        },
        tx,
      );

      // Reconcile stock
      await this.repository.reconcileInventory(
        batch.inventoryId,
        batch.quantity,
        retDec,
        lostDec,
        tx,
      );

      // Update donations in this batch to DISTRIBUTED
      await tx.donation.updateMany({
        where: { batchId: batch.id },
        data: { status: DonationStatus.DISTRIBUTED },
      });

      await this.transparencyRepo.append(tx, {
        eventId: batch.eventId,
        actorId: actor.id,
        action: 'BATCH_RECONCILED',
        entityType: TransparencyEntityType.BATCH,
        entityId: batch.id,
        oldStatus: batch.status,
        newStatus: BatchStatus.DISTRIBUTED,
        details: {
          batchCode: batch.batchCode,
          returnedQuantity: dto.returnedQuantity,
          lostQuantity: dto.lostQuantity,
          reconciliationNote: dto.note,
        },
        isPublic: true,
      });

      return updated;
    });
  }
}
