import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { DonationsService } from './donations.service.js';
import { DonationsRepository } from './donations.repository.js';
import { DonationStatus, EventStatus, OrganizationRole, SystemRole } from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { Prisma } from '@prisma/client';

describe('DonationsService', () => {
  let service: DonationsService;
  let repository: DonationsRepository;
  let prisma: any;
  let organizationAccessService: any;
  let transparencyRepo: any;

  const mockDonorId = 'user-uuid-1';
  const mockNeedId = 'need-uuid-1';
  const mockOrgId = 'org-uuid-1';

  const mockActor: AuthenticatedUser = {
    id: 'organizer-uuid-1',
    email: 'organizer@test.com',
    fullName: 'Test Organizer',
    systemRole: SystemRole.USER,
  };

  const mockDonationNeed = {
    id: mockNeedId,
    eventId: 'event-uuid-1',
    itemTypeId: 'item-uuid-1',
    unitId: 'unit-uuid-1',
    targetQuantity: 500,
    event: {
      id: 'event-uuid-1',
      organizationId: mockOrgId,
      title: 'Flood Relief 2026',
      status: EventStatus.PUBLISHED,
    },
    itemType: {
      id: 'item-uuid-1',
      name: 'Rice',
    },
    unit: {
      id: 'unit-uuid-1',
      name: 'Kilogram',
    },
  };

  const sampleDonation = {
    id: 'donation-uuid-1',
    trackingId: 'DON-2026-ABC123',
    donorId: mockDonorId,
    eventId: 'event-uuid-1',
    donationNeedId: mockNeedId,
    itemTypeId: 'item-uuid-1',
    unitId: 'unit-uuid-1',
    quantity: new Prisma.Decimal(50),
    status: DonationStatus.PENDING,
    createdAt: new Date(),
    event: {
      id: 'event-uuid-1',
      organizationId: mockOrgId,
    },
  };

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findByTrackingId: vi.fn().mockResolvedValue(null),
      findByDonorId: vi.fn(),
      countByDonorId: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      findDonationNeed: vi.fn(),
      findDonationNeedByComposite: vi.fn(),
      findInventory: vi.fn(),
      upsertInventory: vi.fn(),
    } as unknown as DonationsRepository;

    prisma = {
      $transaction: vi.fn((cb) => cb(prisma)),
    };

    organizationAccessService = {
      requireOrganizer: vi.fn().mockResolvedValue({
        id: 'member-1',
        role: OrganizationRole.ORGANIZER,
      }),
    };

    transparencyRepo = {
      append: vi.fn().mockResolvedValue({ id: 'log-uuid-1' }),
    };

    service = new DonationsService(
      repository,
      prisma,
      organizationAccessService,
      transparencyRepo,
    );
  });

  describe('createDonation', () => {
    it('creates donation pledge and auto-generates trackingId starting with DON-', async () => {
      vi.spyOn(repository, 'findDonationNeed').mockResolvedValue(mockDonationNeed as any);
      vi.spyOn(repository, 'create').mockResolvedValue(sampleDonation as any);

      const result = await service.createDonation(mockDonorId, {
        donationNeedId: mockNeedId,
        quantity: 50,
      });

      expect(repository.findDonationNeed).toHaveBeenCalledWith(mockNeedId);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          trackingId: expect.stringMatching(/^DON-\d{4}-[A-Z0-9]+$/),
          donorId: mockDonorId,
          eventId: mockDonationNeed.eventId,
          status: DonationStatus.PENDING,
        }),
        expect.anything(),
      );
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'DONATION_CREATED',
          entityType: 'DONATION',
          actorId: mockDonorId,
          newStatus: DonationStatus.PENDING,
        }),
      );
      expect(result).toEqual(sampleDonation);
    });

    it('creates donation pledge using composite keys (eventId, itemTypeId, unitId)', async () => {
      vi.spyOn(repository, 'findDonationNeedByComposite').mockResolvedValue(mockDonationNeed as any);
      vi.spyOn(repository, 'create').mockResolvedValue(sampleDonation as any);

      const result = await service.createDonation(mockDonorId, {
        eventId: 'event-uuid-1',
        itemTypeId: 'item-uuid-1',
        unitId: 'unit-uuid-1',
        quantity: 50,
      });

      expect(repository.findDonationNeedByComposite).toHaveBeenCalledWith(
        'event-uuid-1',
        'item-uuid-1',
        'unit-uuid-1',
      );
      expect(result).toEqual(sampleDonation);
    });

    it('throws BadRequestException if donation need is not found', async () => {
      vi.spyOn(repository, 'findDonationNeed').mockResolvedValue(null);

      await expect(
        service.createDonation(mockDonorId, {
          donationNeedId: 'invalid-id',
          quantity: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if event is in DRAFT status', async () => {
      vi.spyOn(repository, 'findDonationNeed').mockResolvedValue({
        ...mockDonationNeed,
        event: { ...mockDonationNeed.event, status: EventStatus.DRAFT },
      } as any);

      await expect(
        service.createDonation(mockDonorId, {
          donationNeedId: mockNeedId,
          quantity: 10,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyDonations', () => {
    it('returns donations made by current user', async () => {
      vi.spyOn(repository, 'findByDonorId').mockResolvedValue([sampleDonation] as any);

      const result = await service.getMyDonations(mockDonorId, { skip: 0, take: 20 });

      expect(repository.findByDonorId).toHaveBeenCalledWith(mockDonorId, { skip: 0, take: 20 });
      expect(result).toEqual([sampleDonation]);
    });
  });

  describe('KAN-26: receiveDonation (Receipt Confirmation & Inventory)', () => {
    it('approves donation (RECEIVED) and atomically increments inventory', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(sampleDonation as any);
      vi.spyOn(repository, 'update').mockResolvedValue({
        ...sampleDonation,
        status: DonationStatus.RECEIVED,
        receivedQuantity: new Prisma.Decimal(50),
      } as any);

      const result = await service.receiveDonation(mockActor, sampleDonation.id, {
        status: DonationStatus.RECEIVED,
      });

      expect(organizationAccessService.requireOrganizer).toHaveBeenCalledWith(
        mockActor.id,
        mockOrgId,
      );
      expect(repository.update).toHaveBeenCalledWith(
        sampleDonation.id,
        expect.objectContaining({
          status: DonationStatus.RECEIVED,
          receivedQuantity: sampleDonation.quantity,
          receivedBy: { connect: { id: mockActor.id } },
        }),
        expect.anything(),
      );
      expect(repository.upsertInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: sampleDonation.eventId,
          itemTypeId: sampleDonation.itemTypeId,
          unitId: sampleDonation.unitId,
          quantity: sampleDonation.quantity,
        }),
        expect.anything(),
      );
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'DONATION_RECEIVED',
          entityType: 'DONATION',
          actorId: mockActor.id,
          newStatus: DonationStatus.RECEIVED,
        }),
      );
      expect(result.status).toBe(DonationStatus.RECEIVED);
    });

    it('rejects donation (REJECTED) without updating inventory', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(sampleDonation as any);
      vi.spyOn(repository, 'update').mockResolvedValue({
        ...sampleDonation,
        status: DonationStatus.REJECTED,
        rejectionReason: 'Damaged goods',
      } as any);

      const result = await service.receiveDonation(mockActor, sampleDonation.id, {
        status: DonationStatus.REJECTED,
        rejectionReason: 'Damaged goods',
      });

      expect(repository.update).toHaveBeenCalledWith(
        sampleDonation.id,
        expect.objectContaining({
          status: DonationStatus.REJECTED,
          rejectionReason: 'Damaged goods',
        }),
        expect.anything(),
      );
      expect(repository.upsertInventory).not.toHaveBeenCalled();
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'DONATION_REJECTED',
          newStatus: DonationStatus.REJECTED,
        }),
      );
      expect(result.status).toBe(DonationStatus.REJECTED);
    });

    it('throws BadRequestException if rejecting without rejectionReason', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(sampleDonation as any);

      await expect(
        service.receiveDonation(mockActor, sampleDonation.id, {
          status: DonationStatus.REJECTED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if donation is not PENDING', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue({
        ...sampleDonation,
        status: DonationStatus.RECEIVED,
      } as any);

      await expect(
        service.receiveDonation(mockActor, sampleDonation.id, {
          status: DonationStatus.RECEIVED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws ForbiddenException if caller is not an organizer of the event organization', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(sampleDonation as any);
      organizationAccessService.requireOrganizer.mockRejectedValue(
        new ForbiddenException('Organizer permission is required for this organization'),
      );

      await expect(
        service.receiveDonation(mockActor, sampleDonation.id, {
          status: DonationStatus.RECEIVED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws NotFoundException if donation is not found', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(
        service.receiveDonation(mockActor, 'non-existent-id', {
          status: DonationStatus.RECEIVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });
  });
});
