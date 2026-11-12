import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EvidenceService } from './evidence.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';
import {
  EvidenceReviewStatus,
  SystemRole,
  TransparencyEntityType,
} from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('EvidenceService (US-24 & US-25 Field Evidence & Review)', () => {
  let service: EvidenceService;
  let prisma: any;
  let accessService: any;
  let transparencyRepo: any;

  const mockLeader: AuthenticatedUser = {
    id: 'leader-1',
    email: 'user@openaid.demo',
    fullName: 'Trip Leader',
    systemRole: SystemRole.USER,
  };

  const mockOrganizer: AuthenticatedUser = {
    id: 'organizer-1',
    email: 'organizer@openaid.demo',
    fullName: 'Organizer',
    systemRole: SystemRole.USER,
  };

  beforeEach(() => {
    prisma = {
      $transaction: vi.fn((cb) => cb(prisma)),
      trip: {
        findUnique: vi.fn(),
      },
      tripVolunteer: {
        findFirst: vi.fn(),
      },
      distributionRecord: {
        findUnique: vi.fn(),
      },
      evidence: {
        create: vi.fn(),
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };
    accessService = {
      requireEventOrganizer: vi.fn(),
    };
    transparencyRepo = {
      append: vi.fn().mockResolvedValue({ id: 'log-1' }),
    };

    service = new EvidenceService(
      prisma as unknown as PrismaService,
      accessService as unknown as OrganizationAccessService,
      transparencyRepo as unknown as TransparencyRepository,
    );
  });

  it('allows assigned trip volunteer to upload evidence and logs submission', async () => {
    prisma.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      tripCode: 'TRP-01',
      eventId: 'ev-1',
      points: [{ id: 'pt-1', name: 'UBND Xã Hòa Nhơn' }],
    });
    accessService.requireEventOrganizer.mockRejectedValue(
      new ForbiddenException(),
    );
    prisma.tripVolunteer.findFirst.mockResolvedValue({ id: 'tv-1' });
    prisma.evidence.create.mockResolvedValue({
      id: 'evid-1',
      reviewStatus: EvidenceReviewStatus.PENDING,
    });

    const res = await service.createEvidence(mockLeader, {
      tripId: 'trip-1',
      distributionPointId: 'pt-1',
      privacyConfirmed: true,
      caption: 'Đã trao quà',
    });

    expect(res.id).toBe('evid-1');
    expect(transparencyRepo.append).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'EVIDENCE_SUBMITTED',
        entityType: TransparencyEntityType.EVIDENCE,
        isPublic: false,
      }),
    );
  });

  it('rejects upload when point does not belong to trip', async () => {
    prisma.trip.findUnique.mockResolvedValue({
      id: 'trip-1',
      eventId: 'ev-1',
      points: [{ id: 'pt-1', name: 'Point 1' }],
    });
    accessService.requireEventOrganizer.mockResolvedValue(undefined);

    await expect(
      service.createEvidence(mockOrganizer, {
        tripId: 'trip-1',
        distributionPointId: 'wrong-point',
        privacyConfirmed: true,
      }),
    ).rejects.toThrow(BadRequestException);
  });

  it('reviews evidence (APPROVED) and publishes public transparency log', async () => {
    prisma.evidence.findUnique.mockResolvedValue({
      id: 'evid-1',
      reviewStatus: EvidenceReviewStatus.PENDING,
      caption: 'Trao quà đợt 1',
      trip: { id: 'trip-1', eventId: 'ev-1' },
      point: { id: 'pt-1', name: 'Point 1' },
    });
    accessService.requireEventOrganizer.mockResolvedValue(undefined);
    prisma.evidence.update.mockResolvedValue({
      id: 'evid-1',
      reviewStatus: EvidenceReviewStatus.APPROVED,
    });

    const res = await service.reviewEvidence(mockOrganizer, 'evid-1', {
      status: EvidenceReviewStatus.APPROVED,
      note: 'Ảnh hợp lệ, rõ ràng',
    });

    expect(res.reviewStatus).toBe(EvidenceReviewStatus.APPROVED);
    expect(transparencyRepo.append).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        action: 'EVIDENCE_APPROVED',
        isPublic: true,
      }),
    );
  });

  it('throws NotFoundException when reviewing non-existent evidence', async () => {
    prisma.evidence.findUnique.mockResolvedValue(null);
    await expect(
      service.reviewEvidence(mockOrganizer, 'missing', {
        status: EvidenceReviewStatus.APPROVED,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
