import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { TransparencyService } from './transparency.service.js';
import { TransparencyRepository } from './transparency.repository.js';
import { PrismaService } from '../../database/prisma.service.js';
import {
  DonationStatus,
  EvidenceReviewStatus,
  SystemRole,
  TransparencyEntityType,
  TripStatus,
} from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('TransparencyService (OA-S5-04 / KAN-18 Public Tracking & Privacy)', () => {
  let service: TransparencyService;
  let repository: TransparencyRepository;
  let prisma: PrismaService;

  const mockAdmin: AuthenticatedUser = {
    id: 'admin-uuid',
    email: 'admin@test.com',
    fullName: 'System Admin',
    systemRole: SystemRole.ADMIN,
  };

  const mockUser: AuthenticatedUser = {
    id: 'user-uuid',
    email: 'user@test.com',
    fullName: 'Regular User',
    systemRole: SystemRole.USER,
  };

  beforeEach(() => {
    repository = {
      append: vi.fn(),
      findTimeline: vi.fn(),
      findRecentLogs: vi.fn(),
      countLogs: vi.fn(),
    } as unknown as TransparencyRepository;

    prisma = {
      donation: {
        findUnique: vi.fn(),
      },
      transparencyLog: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    } as unknown as PrismaService;

    service = new TransparencyService(repository, prisma);
  });

  describe('getRecentAuditLogs', () => {
    it('returns paginated audit logs for Admin', async () => {
      const sampleLogs = [
        {
          id: 'log-1',
          action: 'EVENT_STATUS_CHANGED',
          entityType: TransparencyEntityType.EVENT,
          entityId: 'event-1',
          actorId: mockAdmin.id,
          createdAt: new Date(),
        },
      ];

      vi.spyOn(repository, 'findRecentLogs').mockResolvedValue(
        sampleLogs as any,
      );
      vi.spyOn(repository, 'countLogs').mockResolvedValue(1);

      const result = await service.getRecentAuditLogs({ skip: 0, take: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(10);
      expect(repository.findRecentLogs).toHaveBeenCalledWith({
        skip: 0,
        take: 10,
      });
    });
  });

  describe('getTimeline', () => {
    it('queries timeline with isPublicOnly=false when actor is ADMIN', async () => {
      vi.spyOn(repository, 'findTimeline').mockResolvedValue([]);

      await service.getTimeline(mockAdmin, {
        entityType: TransparencyEntityType.EVENT,
        entityId: 'event-1',
      });

      expect(repository.findTimeline).toHaveBeenCalledWith(
        TransparencyEntityType.EVENT,
        'event-1',
        false,
      );
    });

    it('queries timeline with isPublicOnly=true when actor is USER', async () => {
      vi.spyOn(repository, 'findTimeline').mockResolvedValue([]);

      await service.getTimeline(mockUser, {
        entityType: TransparencyEntityType.EVENT,
        entityId: 'event-1',
      });

      expect(repository.findTimeline).toHaveBeenCalledWith(
        TransparencyEntityType.EVENT,
        'event-1',
        true,
      );
    });
  });

  describe('searchByTrackingId (OA-S5-04)', () => {
    it('throws NotFoundException when trackingId does not exist', async () => {
      vi.mocked(prisma.donation.findUnique).mockResolvedValue(null);

      await expect(service.searchByTrackingId('NON-EXISTENT')).rejects.toThrow(
        NotFoundException,
      );
    });

    it('returns complete tracking chain and hides donor personal information (PII)', async () => {
      const mockDonation = {
        id: 'don-uuid-1',
        trackingId: 'TRK-2026-001',
        donorName: 'Secret Donor',
        donorPhone: '0901234567',
        donorEmail: 'secret@donor.com',
        quantity: new Prisma.Decimal(20),
        status: DonationStatus.DISTRIBUTED,
        createdAt: new Date('2026-11-01T10:00:00Z'),
        eventId: 'event-uuid-1',
        itemType: { name: 'Gạo ST25' },
        unit: { name: 'Bao 10kg' },
        event: {
          title: 'Cứu trợ bão số 3',
          organization: { name: 'Hội Chữ Thập Đỏ' },
        },
        batch: {
          id: 'batch-uuid-1',
          batchCode: 'BAT-2026-001',
          quantity: new Prisma.Decimal(100),
          returnedQuantity: new Prisma.Decimal(0),
          lostQuantity: new Prisma.Decimal(0),
          status: 'DISTRIBUTED',
          createdAt: new Date('2026-11-02T10:00:00Z'),
          assignments: [
            {
              trip: {
                id: 'trip-uuid-1',
                tripCode: 'TRP-2026-001',
                departurePoint: 'Kho Hà Nội',
                departureDate: new Date('2026-11-03T07:00:00Z'),
                status: TripStatus.COMPLETED,
                completedAt: new Date('2026-11-03T18:00:00Z'),
                points: [
                  {
                    id: 'point-1',
                    name: 'UBND Xã Bản Khoang',
                    location: 'Sa Pa, Lào Cai',
                    position: 1,
                    status: 'DISTRIBUTED',
                    arrivedAt: new Date('2026-11-03T12:00:00Z'),
                    distributedAt: new Date('2026-11-03T14:00:00Z'),
                    records: [
                      {
                        id: 'record-1',
                        distributedQuantity: new Prisma.Decimal(20),
                        confirmedAt: new Date('2026-11-03T14:00:00Z'),
                        tripBatch: {
                          batch: {
                            batchCode: 'BAT-2026-001',
                          },
                        },
                      },
                    ],
                    evidence: [
                      {
                        id: 'ev-1',
                        imageUrl: 'https://cdn.openaid.org/approved-photo.jpg',
                        caption: 'Trao tận tay bà con',
                        uploadedAt: new Date('2026-11-03T14:30:00Z'),
                        reviewStatus: EvidenceReviewStatus.APPROVED,
                        privacyConfirmed: true,
                      },
                    ],
                  },
                ],
              },
            },
          ],
        },
      };

      vi.mocked(prisma.donation.findUnique).mockResolvedValue(
        mockDonation as any,
      );

      const result = await service.searchByTrackingId('TRK-2026-001');

      // 1. Verify donation data does NOT contain donor PII
      expect(result.donation).toBeDefined();
      expect(result.donation.trackingId).toBe('TRK-2026-001');
      expect(result.donation.itemType).toBe('Gạo ST25');
      expect((result.donation as any).donorName).toBeUndefined();
      expect((result.donation as any).donorPhone).toBeUndefined();
      expect((result.donation as any).donorEmail).toBeUndefined();

      // 2. Verify batch & trip traceability
      expect(result.batch?.batchCode).toBe('BAT-2026-001');
      expect(result.trip?.tripCode).toBe('TRP-2026-001');

      // 3. Verify public evidence
      expect(result.publicEvidences).toHaveLength(1);
      expect(result.publicEvidences[0].imageUrl).toBe(
        'https://cdn.openaid.org/approved-photo.jpg',
      );
      expect(result.distributionPoints[0].name).toBe('UBND Xã Bản Khoang');
    });
  });
});
