import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { BatchesService } from './batches.service.js';
import { BatchesRepository } from './batches.repository.js';
import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';
import {
  BatchStatus,
  DonationStatus,
  SystemRole,
} from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('BatchesService (OA-S4-05 Inventory & Batch Management)', () => {
  let service: BatchesService;
  let repository: BatchesRepository;
  let prisma: PrismaService;
  let orgAccess: OrganizationAccessService;
  let transparencyRepo: TransparencyRepository;

  const mockAdmin: AuthenticatedUser = {
    id: 'admin-uuid',
    email: 'admin@openaid.org',
    fullName: 'Admin User',
    systemRole: SystemRole.ADMIN,
  };

  const mockOrganizer: AuthenticatedUser = {
    id: 'organizer-uuid',
    email: 'organizer@openaid.org',
    fullName: 'Organizer User',
    systemRole: SystemRole.USER,
  };

  const mockEventId = 'event-uuid-1';
  const mockItemTypeId = 'item-type-uuid-1';
  const mockUnitId = 'unit-uuid-1';
  const mockInventoryId = 'inventory-uuid-1';

  beforeEach(() => {
    repository = {
      findDonationsByIds: vi.fn(),
      findInventory: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      findByEvent: vi.fn(),
      update: vi.fn(),
      reserveInventory: vi.fn(),
      reconcileInventory: vi.fn(),
    } as unknown as BatchesRepository;

    prisma = {
      $transaction: vi.fn(async (callback: any) =>
        callback({
          donation: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        }),
      ),
    } as unknown as PrismaService;

    orgAccess = {
      requireEventOrganizer: vi.fn(),
    } as unknown as OrganizationAccessService;

    transparencyRepo = {
      append: vi.fn().mockResolvedValue({ id: 'log-uuid' }),
    } as unknown as TransparencyRepository;

    service = new BatchesService(
      repository,
      prisma,
      orgAccess,
      transparencyRepo,
    );
  });

  describe('createBatch', () => {
    const validDto = {
      eventId: mockEventId,
      donationIds: ['don-1', 'don-2'],
    };

    const mockDonations = [
      {
        id: 'don-1',
        trackingId: 'TRK-001',
        eventId: mockEventId,
        status: DonationStatus.RECEIVED,
        batchId: null,
        itemTypeId: mockItemTypeId,
        unitId: mockUnitId,
        quantity: new Prisma.Decimal(10),
        itemType: { name: 'Mì tôm' },
        unit: { name: 'Thùng' },
      },
      {
        id: 'don-2',
        trackingId: 'TRK-002',
        eventId: mockEventId,
        status: DonationStatus.RECEIVED,
        batchId: null,
        itemTypeId: mockItemTypeId,
        unitId: mockUnitId,
        quantity: new Prisma.Decimal(15),
        itemType: { name: 'Mì tôm' },
        unit: { name: 'Thùng' },
      },
    ];

    it('requires event organizer permission for non-admin actors', async () => {
      vi.mocked(orgAccess.requireEventOrganizer).mockRejectedValue(
        new ForbiddenException('Not organizer'),
      );

      await expect(
        service.createBatch(mockOrganizer, validDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if donation IDs do not match retrieved donations', async () => {
      vi.mocked(repository.findDonationsByIds).mockResolvedValue([
        mockDonations[0],
      ] as any);

      await expect(service.createBatch(mockAdmin, validDto)).rejects.toThrow(
        /One or more donation IDs are invalid/,
      );
    });

    it('throws BadRequestException if donations belong to different events', async () => {
      const mismatched = [
        mockDonations[0],
        { ...mockDonations[1], eventId: 'other-event' },
      ];
      vi.mocked(repository.findDonationsByIds).mockResolvedValue(
        mismatched as any,
      );

      await expect(service.createBatch(mockAdmin, validDto)).rejects.toThrow(
        /All donations in a batch must belong to the specified event/,
      );
    });

    it('throws BadRequestException if any donation is not in RECEIVED status', async () => {
      const notReceived = [
        mockDonations[0],
        { ...mockDonations[1], status: DonationStatus.PENDING },
      ];
      vi.mocked(repository.findDonationsByIds).mockResolvedValue(
        notReceived as any,
      );

      await expect(service.createBatch(mockAdmin, validDto)).rejects.toThrow(
        /Only RECEIVED donations can be batched/,
      );
    });

    it('throws BadRequestException if donations have mismatched item types or units', async () => {
      const mismatchedItem = [
        mockDonations[0],
        { ...mockDonations[1], itemTypeId: 'different-item' },
      ];
      vi.mocked(repository.findDonationsByIds).mockResolvedValue(
        mismatchedItem as any,
      );

      await expect(service.createBatch(mockAdmin, validDto)).rejects.toThrow(
        /All donations in a batch must share the exact same item type and unit/,
      );
    });

    it('throws BadRequestException if inventory available quantity is insufficient', async () => {
      vi.mocked(repository.findDonationsByIds).mockResolvedValue(
        mockDonations as any,
      );
      vi.mocked(repository.findInventory).mockResolvedValue({
        id: mockInventoryId,
        availableQuantity: new Prisma.Decimal(20), // Needs 25
      } as any);

      await expect(service.createBatch(mockAdmin, validDto)).rejects.toThrow(
        /Insufficient available inventory to form batch/,
      );
    });

    it('successfully creates batch and transitions inventory from Available to Reserved', async () => {
      vi.mocked(repository.findDonationsByIds).mockResolvedValue(
        mockDonations as any,
      );
      vi.mocked(repository.findInventory).mockResolvedValue({
        id: mockInventoryId,
        availableQuantity: new Prisma.Decimal(50),
      } as any);

      const fakeBatch = {
        id: 'batch-1',
        batchCode: 'BAT-TEST',
        eventId: mockEventId,
        quantity: new Prisma.Decimal(25),
        status: BatchStatus.DRAFT,
      };
      vi.mocked(repository.create).mockResolvedValue(fakeBatch as any);

      const result = await service.createBatch(mockAdmin, validDto);

      expect(result).toEqual(fakeBatch);
      expect(repository.reserveInventory).toHaveBeenCalledWith(
        mockInventoryId,
        new Prisma.Decimal(25),
        expect.anything(),
      );
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'BATCH_CREATED',
          entityType: 'BATCH',
          isPublic: true,
        }),
      );
    });
  });

  describe('reconcileBatch', () => {
    const mockBatch = {
      id: 'batch-1',
      batchCode: 'BAT-001',
      eventId: mockEventId,
      inventoryId: mockInventoryId,
      quantity: new Prisma.Decimal(100),
      status: BatchStatus.ASSIGNED,
    };

    it('throws NotFoundException if batch does not exist', async () => {
      vi.mocked(repository.findById).mockResolvedValue(null);

      await expect(
        service.reconcileBatch(mockAdmin, 'invalid-id', {
          returnedQuantity: 10,
          lostQuantity: 5,
          note: 'Reconciled',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if returned + lost exceeds total batch quantity', async () => {
      vi.mocked(repository.findById).mockResolvedValue(mockBatch as any);

      await expect(
        service.reconcileBatch(mockAdmin, mockBatch.id, {
          returnedQuantity: 60,
          lostQuantity: 50, // 110 > 100
          note: 'Exceeded',
        }),
      ).rejects.toThrow(/cannot exceed batch total quantity/);
    });

    it('reconciles inventory properly and updates batch status to DISTRIBUTED', async () => {
      vi.mocked(repository.findById).mockResolvedValue(mockBatch as any);
      const updatedBatch = {
        ...mockBatch,
        status: BatchStatus.DISTRIBUTED,
        returnedQuantity: new Prisma.Decimal(10),
        lostQuantity: new Prisma.Decimal(5),
      };
      vi.mocked(repository.update).mockResolvedValue(updatedBatch as any);

      const result = await service.reconcileBatch(mockAdmin, mockBatch.id, {
        returnedQuantity: 10,
        lostQuantity: 5,
        note: 'Completed distribution',
      });

      expect(result.status).toBe(BatchStatus.DISTRIBUTED);
      expect(repository.reconcileInventory).toHaveBeenCalledWith(
        mockInventoryId,
        new Prisma.Decimal(100),
        new Prisma.Decimal(10),
        new Prisma.Decimal(5),
        expect.anything(),
      );
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'BATCH_RECONCILED',
          newStatus: BatchStatus.DISTRIBUTED,
        }),
      );
    });
  });
});
