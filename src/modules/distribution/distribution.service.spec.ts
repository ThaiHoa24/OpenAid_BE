import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DistributionService } from './distribution.service.js';
import { DistributionRepository } from './distribution.repository.js';
import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';
import {
  DistributionPointStatus,
  SystemRole,
} from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('DistributionService (OA-S5-07 Distribution Record & Point Execution)', () => {
  let service: DistributionService;
  let repository: DistributionRepository;
  let prisma: PrismaService;
  let orgAccess: OrganizationAccessService;
  let transparencyRepo: TransparencyRepository;

  const mockAdmin: AuthenticatedUser = {
    id: 'admin-uuid',
    email: 'admin@openaid.org',
    fullName: 'Admin User',
    systemRole: SystemRole.ADMIN,
  };

  const mockLeader: AuthenticatedUser = {
    id: 'leader-uuid',
    email: 'leader@openaid.org',
    fullName: 'Trip Leader',
    systemRole: SystemRole.USER,
  };

  const mockStranger: AuthenticatedUser = {
    id: 'stranger-uuid',
    email: 'stranger@openaid.org',
    fullName: 'Stranger User',
    systemRole: SystemRole.USER,
  };

  const mockTripId = 'trip-uuid-1';
  const mockTripBatchId = 'trip-batch-uuid-1';
  const mockPointId = 'point-uuid-1';
  const mockEventId = 'event-uuid-1';

  beforeEach(() => {
    repository = {
      findTripBatch: vi.fn(),
      findPoint: vi.fn(),
      createRecord: vi.fn(),
      updatePoint: vi.fn(),
      findRecordById: vi.fn(),
      findRecordsByTrip: vi.fn(),
    } as unknown as DistributionRepository;

    prisma = {
      tripVolunteer: {
        findFirst: vi.fn(),
      },
      distributionRecord: {
        findMany: vi.fn(),
      },
      $transaction: vi.fn(async (cb: any) =>
        cb({
          distributionRecord: {
            create: vi.fn(),
          },
        }),
      ),
    } as unknown as PrismaService;

    orgAccess = {
      requireEventOrganizer: vi.fn(),
    } as unknown as OrganizationAccessService;

    transparencyRepo = {
      append: vi.fn().mockResolvedValue({ id: 'log-uuid' }),
    } as unknown as TransparencyRepository;

    service = new DistributionService(
      repository,
      prisma,
      orgAccess,
      transparencyRepo,
    );
  });

  describe('createDistribution', () => {
    const validDto = {
      tripBatchId: mockTripBatchId,
      distributionPointId: mockPointId,
      distributedQuantity: 20,
      beneficiaryCount: 15,
      notes: 'Delivered successfully',
    };

    const mockTripBatch = {
      id: mockTripBatchId,
      tripId: mockTripId,
      eventId: mockEventId,
      batch: {
        batchCode: 'BAT-001',
        quantity: new Prisma.Decimal(50),
      },
    };

    const mockPoint = {
      id: mockPointId,
      tripId: mockTripId,
      name: 'Điểm 1',
      status: DistributionPointStatus.ARRIVED,
    };

    it('throws NotFoundException if tripBatch or point is missing', async () => {
      vi.mocked(repository.findTripBatch).mockResolvedValue(null);

      await expect(
        service.createDistribution(mockAdmin, validDto),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if tripBatch and point belong to different trips', async () => {
      vi.mocked(repository.findTripBatch).mockResolvedValue(
        mockTripBatch as any,
      );
      vi.mocked(repository.findPoint).mockResolvedValue({
        ...mockPoint,
        tripId: 'different-trip',
      } as any);

      await expect(
        service.createDistribution(mockAdmin, validDto),
      ).rejects.toThrow(/must belong to the same trip/);
    });

    it('throws ForbiddenException if user is neither admin, organizer, nor trip leader', async () => {
      vi.mocked(repository.findTripBatch).mockResolvedValue(
        mockTripBatch as any,
      );
      vi.mocked(repository.findPoint).mockResolvedValue(mockPoint as any);
      vi.mocked(prisma.tripVolunteer.findFirst).mockResolvedValue(null);
      vi.mocked(orgAccess.requireEventOrganizer).mockRejectedValue(
        new ForbiddenException('Not organizer'),
      );

      await expect(
        service.createDistribution(mockStranger, validDto),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if cumulative distributed quantity exceeds batch quantity', async () => {
      vi.mocked(repository.findTripBatch).mockResolvedValue(
        mockTripBatch as any,
      );
      vi.mocked(repository.findPoint).mockResolvedValue(mockPoint as any);
      vi.mocked(prisma.tripVolunteer.findFirst).mockResolvedValue({
        id: 'tv-1',
      } as any);

      // Already distributed 40, attempting 20 more -> 60 > 50
      vi.mocked(prisma.distributionRecord.findMany).mockResolvedValue([
        { distributedQuantity: new Prisma.Decimal(40) } as any,
      ]);

      await expect(
        service.createDistribution(mockLeader, validDto),
      ).rejects.toThrow(/would exceed the batch total quantity/);
    });

    it('successfully records distribution and marks point as DISTRIBUTED', async () => {
      vi.mocked(repository.findTripBatch).mockResolvedValue(
        mockTripBatch as any,
      );
      vi.mocked(repository.findPoint).mockResolvedValue(mockPoint as any);
      vi.mocked(prisma.tripVolunteer.findFirst).mockResolvedValue({
        id: 'tv-1',
      } as any);
      vi.mocked(prisma.distributionRecord.findMany).mockResolvedValue([
        { distributedQuantity: new Prisma.Decimal(10) } as any,
      ]);

      const fakeRecord = {
        id: 'record-1',
        tripId: mockTripId,
        tripBatchId: mockTripBatchId,
        distributedQuantity: new Prisma.Decimal(20),
      };
      vi.mocked(repository.createRecord).mockResolvedValue(fakeRecord as any);

      const result = await service.createDistribution(mockLeader, validDto);

      expect(result).toEqual(fakeRecord);
      expect(repository.updatePoint).toHaveBeenCalledWith(
        mockPointId,
        expect.objectContaining({
          status: DistributionPointStatus.DISTRIBUTED,
        }),
        expect.anything(),
      );
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'DISTRIBUTION_RECORDED',
          isPublic: true,
        }),
      );
    });
  });
});
