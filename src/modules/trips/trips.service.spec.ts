import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException } from '@nestjs/common';
import { TripsService } from './trips.service.js';
import { TripsRepository } from './trips.repository.js';
import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';
import {
  BatchStatus,
  DistributionPointStatus,
  SystemRole,
  TripStatus,
  TripVolunteerRole,
  VolunteerApplicationStatus,
} from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('TripsService (OA-S4-03 / OA-S4-06 Trip Lifecycle & Authorization)', () => {
  let service: TripsService;
  let repository: TripsRepository;
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

  const mockLeader: AuthenticatedUser = {
    id: 'leader-uuid',
    email: 'leader@openaid.org',
    fullName: 'Leader User',
    systemRole: SystemRole.USER,
  };

  const mockStranger: AuthenticatedUser = {
    id: 'stranger-uuid',
    email: 'stranger@openaid.org',
    fullName: 'Stranger User',
    systemRole: SystemRole.USER,
  };

  const mockEventId = 'event-uuid-1';

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByEvent: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    } as unknown as TripsRepository;

    prisma = {
      batch: {
        findMany: vi.fn(),
        updateMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
      volunteerApplication: {
        findMany: vi.fn(),
      },
      trip: {
        create: vi.fn(),
        update: vi.fn(),
      },
      $transaction: vi.fn(async (cb: any) =>
        cb({
          trip: {
            create: vi.fn().mockResolvedValue({
              id: 'trip-1',
              tripCode: 'TRP-TEST',
              eventId: mockEventId,
              status: TripStatus.SCHEDULED,
            }),
            update: vi.fn().mockResolvedValue({
              id: 'trip-1',
              status: TripStatus.IN_TRANSIT,
            }),
          },
          batch: { updateMany: vi.fn().mockResolvedValue({ count: 1 }) },
        }),
      ),
    } as unknown as PrismaService;

    orgAccess = {
      requireEventOrganizer: vi.fn(),
    } as unknown as OrganizationAccessService;

    transparencyRepo = {
      append: vi.fn().mockResolvedValue({ id: 'log-uuid' }),
    } as unknown as TransparencyRepository;

    service = new TripsService(repository, prisma, orgAccess, transparencyRepo);
  });

  describe('createTrip', () => {
    const validDto = {
      eventId: mockEventId,
      departurePoint: 'Kho Trung Tam',
      departureDate: new Date().toISOString(),
      batchIds: ['batch-1'],
      volunteers: [
        {
          applicationId: 'app-1',
          role: TripVolunteerRole.LEADER,
        },
      ],
      points: [
        {
          position: 1,
          name: 'Điểm phát số 1',
          location: 'Trường tiểu học A',
        },
      ],
    };

    it('requires event organizer permission for non-admin', async () => {
      vi.mocked(orgAccess.requireEventOrganizer).mockRejectedValue(
        new ForbiddenException('Not organizer'),
      );

      await expect(service.createTrip(mockOrganizer, validDto)).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws BadRequestException if any batch is not found or from different event', async () => {
      vi.mocked(prisma.batch.findMany).mockResolvedValue([
        {
          id: 'batch-1',
          batchCode: 'BAT-1',
          eventId: 'other-event',
          status: BatchStatus.READY,
        } as any,
      ]);

      await expect(service.createTrip(mockAdmin, validDto)).rejects.toThrow(
        /All batches must belong to the specified event/,
      );
    });

    it('throws BadRequestException if batch status is not READY or DRAFT', async () => {
      vi.mocked(prisma.batch.findMany).mockResolvedValue([
        {
          id: 'batch-1',
          batchCode: 'BAT-1',
          eventId: mockEventId,
          status: BatchStatus.ASSIGNED, // Already assigned!
        } as any,
      ]);

      await expect(service.createTrip(mockAdmin, validDto)).rejects.toThrow(
        /Only READY or DRAFT batches can be assigned/,
      );
    });

    it('throws BadRequestException if volunteer application is not APPROVED', async () => {
      vi.mocked(prisma.batch.findMany).mockResolvedValue([
        {
          id: 'batch-1',
          batchCode: 'BAT-1',
          eventId: mockEventId,
          status: BatchStatus.READY,
        } as any,
      ]);
      vi.mocked(prisma.volunteerApplication.findMany).mockResolvedValue([
        {
          id: 'app-1',
          eventId: mockEventId,
          status: VolunteerApplicationStatus.PENDING,
        } as any,
      ]);

      await expect(service.createTrip(mockAdmin, validDto)).rejects.toThrow(
        /is not APPROVED/,
      );
    });

    it('throws BadRequestException if trip does not have exactly one LEADER', async () => {
      vi.mocked(prisma.batch.findMany).mockResolvedValue([
        {
          id: 'batch-1',
          batchCode: 'BAT-1',
          eventId: mockEventId,
          status: BatchStatus.READY,
        } as any,
      ]);
      vi.mocked(prisma.volunteerApplication.findMany).mockResolvedValue([
        {
          id: 'app-1',
          eventId: mockEventId,
          status: VolunteerApplicationStatus.APPROVED,
        } as any,
      ]);

      const dtoWithoutLeader = {
        ...validDto,
        volunteers: [
          { applicationId: 'app-1', role: TripVolunteerRole.MEMBER },
        ],
      };

      await expect(
        service.createTrip(mockAdmin, dtoWithoutLeader),
      ).rejects.toThrow(/A trip must have exactly one LEADER/);
    });

    it('throws BadRequestException if distribution point positions are duplicated', async () => {
      vi.mocked(prisma.batch.findMany).mockResolvedValue([
        {
          id: 'batch-1',
          batchCode: 'BAT-1',
          eventId: mockEventId,
          status: BatchStatus.READY,
        } as any,
      ]);
      vi.mocked(prisma.volunteerApplication.findMany).mockResolvedValue([
        {
          id: 'app-1',
          eventId: mockEventId,
          status: VolunteerApplicationStatus.APPROVED,
        } as any,
      ]);

      const dtoDuplicatePos = {
        ...validDto,
        points: [
          { position: 1, name: 'P1', location: 'L1' },
          { position: 1, name: 'P2', location: 'L2' },
        ],
      };

      await expect(
        service.createTrip(mockAdmin, dtoDuplicatePos),
      ).rejects.toThrow(/positions must be unique/);
    });
  });

  describe('updateTrip', () => {
    const existingTrip = {
      id: 'trip-1',
      tripCode: 'TRP-001',
      eventId: mockEventId,
      status: TripStatus.SCHEDULED,
      batches: [{ batchId: 'batch-1' }],
      volunteers: [
        {
          role: TripVolunteerRole.LEADER,
          application: { user: { id: mockLeader.id } },
        },
      ],
      points: [
        {
          id: 'p-1',
          name: 'Point 1',
          status: DistributionPointStatus.PENDING,
        },
      ],
    };

    it('throws BadRequestException when updating an already COMPLETED trip', async () => {
      vi.mocked(repository.findById).mockResolvedValue({
        ...existingTrip,
        status: TripStatus.COMPLETED,
      } as any);

      await expect(
        service.updateTrip(mockAdmin, existingTrip.id, {
          status: TripStatus.IN_TRANSIT,
        }),
      ).rejects.toThrow(/Cannot change status of a trip that is already/);
    });

    it('throws ForbiddenException when an unauthorized user attempts to update trip', async () => {
      vi.mocked(repository.findById).mockResolvedValue(existingTrip as any);
      vi.mocked(orgAccess.requireEventOrganizer).mockRejectedValue(
        new ForbiddenException('Not organizer'),
      );

      await expect(
        service.updateTrip(mockStranger, existingTrip.id, {
          status: TripStatus.IN_TRANSIT,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('allows Trip Leader to update trip status even if not organizer', async () => {
      vi.mocked(repository.findById).mockResolvedValue(existingTrip as any);

      const result = await service.updateTrip(mockLeader, existingTrip.id, {
        status: TripStatus.IN_TRANSIT,
      });

      expect(result).toBeDefined();
    });

    it('throws BadRequestException when completing trip if points are not DISTRIBUTED or SKIPPED', async () => {
      vi.mocked(repository.findById).mockResolvedValue({
        ...existingTrip,
        status: TripStatus.IN_TRANSIT,
        points: [
          { id: 'p-1', status: DistributionPointStatus.DISTRIBUTED },
          { id: 'p-2', status: DistributionPointStatus.PENDING },
        ],
      } as any);

      await expect(
        service.updateTrip(mockAdmin, existingTrip.id, {
          status: TripStatus.COMPLETED,
        }),
      ).rejects.toThrow(
        /Cannot complete trip: 1 distribution point\(s\) are not yet/,
      );
    });

    it('throws BadRequestException when cancelling trip if distribution already occurred', async () => {
      vi.mocked(repository.findById).mockResolvedValue({
        ...existingTrip,
        status: TripStatus.IN_TRANSIT,
        points: [{ id: 'p-1', status: DistributionPointStatus.DISTRIBUTED }],
      } as any);

      await expect(
        service.updateTrip(mockAdmin, existingTrip.id, {
          status: TripStatus.CANCELLED,
        }),
      ).rejects.toThrow(
        /Cannot cancel a trip after distribution has already occurred/,
      );
    });

    it('rolls back batch statuses to READY when trip is cancelled', async () => {
      let capturedTxBatchUpdate: any = null;
      vi.mocked(prisma.$transaction).mockImplementation(async (cb: any) => {
        const tx = {
          batch: {
            updateMany: vi.fn().mockImplementation((args) => {
              capturedTxBatchUpdate = args;
              return { count: 1 };
            }),
          },
          trip: {
            update: vi.fn().mockResolvedValue({
              ...existingTrip,
              status: TripStatus.CANCELLED,
            }),
          },
        };
        return cb(tx);
      });

      vi.mocked(repository.findById).mockResolvedValue({
        ...existingTrip,
        points: [{ id: 'p-1', status: DistributionPointStatus.PENDING }],
      } as any);

      const result = await service.updateTrip(mockAdmin, existingTrip.id, {
        status: TripStatus.CANCELLED,
      });

      expect(result.status).toBe(TripStatus.CANCELLED);
      expect(capturedTxBatchUpdate).toEqual({
        where: { id: { in: ['batch-1'] } },
        data: { status: BatchStatus.READY },
      });
    });
  });
});
