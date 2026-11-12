import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DonationsService } from './donations.service.js';
import { DonationsRepository } from './donations.repository.js';
import {
  DonationStatus,
  EventStatus,
  SystemRole,
  TransparencyEntityType,
} from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('DonationsService', () => {
  let service: DonationsService;
  let repository: any;
  let prisma: any;
  let organizationAccessService: any;
  let transparencyRepo: any;

  const mockDonor: AuthenticatedUser = {
    id: 'user-donor-1',
    email: 'donor@test.com',
    fullName: 'Test Donor',
    systemRole: SystemRole.USER,
  };

  const mockOrganizer: AuthenticatedUser = {
    id: 'user-org-1',
    email: 'organizer@test.com',
    fullName: 'Test Organizer',
    systemRole: SystemRole.USER,
  };

  const mockAdmin: AuthenticatedUser = {
    id: 'user-admin-1',
    email: 'admin@test.com',
    fullName: 'Test Admin',
    systemRole: SystemRole.ADMIN,
  };

  const mockOtherUser: AuthenticatedUser = {
    id: 'user-other-1',
    email: 'other@test.com',
    fullName: 'Other User',
    systemRole: SystemRole.USER,
  };

  const sampleEvent = {
    id: 'event-uuid-1',
    organizationId: 'org-uuid-1',
    title: 'Support Flooded Areas',
    status: EventStatus.PUBLISHED,
  };

  const sampleNeed = {
    id: 'need-uuid-1',
    eventId: sampleEvent.id,
    itemTypeId: 'item-rice-1',
    unitId: 'unit-kg-1',
    targetQuantity: new Prisma.Decimal(1000),
    event: sampleEvent,
    itemType: { id: 'item-rice-1', name: 'Gạo tẻ' },
    unit: { id: 'unit-kg-1', name: 'Kg' },
  };

  const sampleDonation = {
    id: 'donation-uuid-1',
    trackingId: 'TRK-TEST-1234',
    eventId: sampleEvent.id,
    donationNeedId: sampleNeed.id,
    itemTypeId: sampleNeed.itemTypeId,
    unitId: sampleNeed.unitId,
    donorId: mockDonor.id,
    quantity: new Prisma.Decimal(50),
    status: DonationStatus.PENDING,
    receivedQuantity: null,
    receivedById: null,
    receivedAt: null,
    rejectionReason: null,
  };

  beforeEach(() => {
    repository = {
      findNeedWithEvent: vi.fn(),
      create: vi.fn(),
      findById: vi.fn(),
      findMyDonations: vi.fn(),
      findEventDonations: vi.fn(),
      update: vi.fn(),
      upsertInventoryReceived: vi.fn(),
    };

    prisma = {
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };

    organizationAccessService = {
      requireEventOrganizer: vi.fn().mockResolvedValue(undefined),
    };

    transparencyRepo = {
      append: vi.fn().mockResolvedValue(undefined),
    };

    service = new DonationsService(
      repository as unknown as DonationsRepository,
      prisma,
      organizationAccessService,
      transparencyRepo,
    );
  });

  describe('createDonation (DON-01)', () => {
    it('successfully creates a donation, generates unique Tracking ID, and logs transparency event', async () => {
      repository.findNeedWithEvent.mockResolvedValue(sampleNeed);
      repository.create.mockImplementation(async (data: any) => ({
        ...sampleDonation,
        ...data,
        id: 'new-donation-id',
      }));

      const result = await service.createDonation(mockDonor.id, {
        donationNeedId: sampleNeed.id,
        quantity: 50,
      });

      expect(result.id).toBe('new-donation-id');
      expect(result.status).toBe(DonationStatus.PENDING);
      expect(result.trackingId).toMatch(/^TRK-/);
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: sampleNeed.eventId,
          donationNeedId: sampleNeed.id,
          itemTypeId: sampleNeed.itemTypeId,
          unitId: sampleNeed.unitId,
          donorId: mockDonor.id,
          status: DonationStatus.PENDING,
        }),
        expect.anything(),
      );
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventId: sampleNeed.eventId,
          actorId: mockDonor.id,
          action: 'DONATION_PLEDGED',
          entityType: TransparencyEntityType.DONATION,
          newStatus: DonationStatus.PENDING,
          isPublic: true,
        }),
      );
    });

    it('DON-IMG: persists photoUrl and records notes in transparency log when provided', async () => {
      repository.findNeedWithEvent.mockResolvedValue(sampleNeed);
      repository.create.mockImplementation(async (data: any) => ({
        ...sampleDonation,
        ...data,
        id: 'new-donation-photo-id',
      }));

      const result = await service.createDonation(mockDonor.id, {
        donationNeedId: sampleNeed.id,
        quantity: 25,
        photoUrl: 'https://openaid.demo/uploads/rice-box.jpg',
        notes: 'Giao tại điểm tập kết quận Hải Châu',
      });

      expect(result.photoUrl).toBe('https://openaid.demo/uploads/rice-box.jpg');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          photoUrl: 'https://openaid.demo/uploads/rice-box.jpg',
        }),
        expect.anything(),
      );
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          details: expect.objectContaining({
            photoUrl: 'https://openaid.demo/uploads/rice-box.jpg',
            notes: 'Giao tại điểm tập kết quận Hải Châu',
          }),
        }),
      );
    });

    it('throws NotFoundException if donationNeed does not exist', async () => {
      repository.findNeedWithEvent.mockResolvedValue(null);

      await expect(
        service.createDonation(mockDonor.id, {
          donationNeedId: 'non-existent-need',
          quantity: 20,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if event is not PUBLISHED', async () => {
      repository.findNeedWithEvent.mockResolvedValue({
        ...sampleNeed,
        event: { ...sampleEvent, status: EventStatus.DRAFT },
      });

      await expect(
        service.createDonation(mockDonor.id, {
          donationNeedId: sampleNeed.id,
          quantity: 20,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getMyDonations (DON-02)', () => {
    it('returns donations belonging to the donor with pagination', async () => {
      const mockResult = {
        items: [sampleDonation],
        total: 1,
        skip: 0,
        take: 20,
      };
      repository.findMyDonations.mockResolvedValue(mockResult);

      const result = await service.getMyDonations(mockDonor.id, {
        skip: 0,
        take: 20,
      });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(repository.findMyDonations).toHaveBeenCalledWith(
        mockDonor.id,
        0,
        20,
      );
    });
  });

  describe('getEventDonations (DON-03)', () => {
    it('returns event donations for organizer', async () => {
      const mockResult = {
        items: [sampleDonation],
        total: 1,
        skip: 0,
        take: 20,
      };
      repository.findEventDonations.mockResolvedValue(mockResult);

      const result = await service.getEventDonations(
        mockOrganizer,
        sampleEvent.id,
        { skip: 0, take: 20 },
      );

      expect(result.items).toHaveLength(1);
      expect(
        organizationAccessService.requireEventOrganizer,
      ).toHaveBeenCalledWith(mockOrganizer.id, sampleEvent.id);
    });

    it('allows ADMIN to view event donations without requiring organizer membership', async () => {
      const mockResult = {
        items: [sampleDonation],
        total: 1,
        skip: 0,
        take: 20,
      };
      repository.findEventDonations.mockResolvedValue(mockResult);

      const result = await service.getEventDonations(
        mockAdmin,
        sampleEvent.id,
        { skip: 0, take: 20 },
      );

      expect(result.items).toHaveLength(1);
      expect(
        organizationAccessService.requireEventOrganizer,
      ).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException if non-organizer attempts to view event donations', async () => {
      organizationAccessService.requireEventOrganizer.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(
        service.getEventDonations(mockOtherUser, sampleEvent.id, {}),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('receiveDonation (DON-04)', () => {
    it('successfully confirms receipt, increases inventory Available, and logs transparency event', async () => {
      repository.findById.mockResolvedValue(sampleDonation);
      repository.update.mockResolvedValue({
        ...sampleDonation,
        status: DonationStatus.RECEIVED,
        receivedById: mockOrganizer.id,
        receivedQuantity: sampleDonation.quantity,
      });
      repository.upsertInventoryReceived.mockResolvedValue({ id: 'inv-1' });

      const result = await service.receiveDonation(
        mockOrganizer,
        sampleDonation.id,
        {
          status: DonationStatus.RECEIVED,
        },
      );

      expect(result.status).toBe(DonationStatus.RECEIVED);
      expect(
        organizationAccessService.requireEventOrganizer,
      ).toHaveBeenCalledWith(mockOrganizer.id, sampleEvent.id);
      expect(repository.upsertInventoryReceived).toHaveBeenCalledWith(
        sampleDonation.eventId,
        sampleDonation.itemTypeId,
        sampleDonation.unitId,
        sampleDonation.quantity,
        expect.anything(),
      );
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventId: sampleDonation.eventId,
          actorId: mockOrganizer.id,
          action: 'DONATION_RECEIVED',
          entityType: TransparencyEntityType.DONATION,
          oldStatus: DonationStatus.PENDING,
          newStatus: DonationStatus.RECEIVED,
          isPublic: true,
        }),
      );
    });

    it('successfully rejects donation with reason and DOES NOT increase inventory', async () => {
      repository.findById.mockResolvedValue(sampleDonation);
      repository.update.mockResolvedValue({
        ...sampleDonation,
        status: DonationStatus.REJECTED,
        rejectionReason: 'Hàng hoá không đúng quy chuẩn bảo quản',
      });

      const result = await service.receiveDonation(
        mockOrganizer,
        sampleDonation.id,
        {
          status: DonationStatus.REJECTED,
          rejectionReason: 'Hàng hoá không đúng quy chuẩn bảo quản',
        },
      );

      expect(result.status).toBe(DonationStatus.REJECTED);
      expect(repository.upsertInventoryReceived).not.toHaveBeenCalled();
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventId: sampleDonation.eventId,
          actorId: mockOrganizer.id,
          action: 'DONATION_REJECTED',
          entityType: TransparencyEntityType.DONATION,
          oldStatus: DonationStatus.PENDING,
          newStatus: DonationStatus.REJECTED,
          isPublic: false,
        }),
      );
    });

    it('throws NotFoundException if donation does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.receiveDonation(mockOrganizer, 'non-existent-donation', {
          status: DonationStatus.RECEIVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if donation is not in PENDING status', async () => {
      repository.findById.mockResolvedValue({
        ...sampleDonation,
        status: DonationStatus.RECEIVED, // already received
      });

      await expect(
        service.receiveDonation(mockOrganizer, sampleDonation.id, {
          status: DonationStatus.RECEIVED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('allows ADMIN to receive donation without organizer membership', async () => {
      repository.findById.mockResolvedValue(sampleDonation);
      repository.update.mockResolvedValue({
        ...sampleDonation,
        status: DonationStatus.RECEIVED,
      });

      await service.receiveDonation(mockAdmin, sampleDonation.id, {
        status: DonationStatus.RECEIVED,
      });

      expect(
        organizationAccessService.requireEventOrganizer,
      ).not.toHaveBeenCalled();
      expect(repository.upsertInventoryReceived).toHaveBeenCalled();
    });
  });

  describe('cancelDonation (DON-05)', () => {
    it('successfully cancels a PENDING donation by donor and logs transparency event', async () => {
      repository.findById.mockResolvedValue(sampleDonation);
      repository.update.mockResolvedValue({
        ...sampleDonation,
        status: DonationStatus.CANCELLED,
      });

      const result = await service.cancelDonation(
        mockDonor.id,
        sampleDonation.id,
      );

      expect(result.status).toBe(DonationStatus.CANCELLED);
      expect(repository.update).toHaveBeenCalledWith(
        sampleDonation.id,
        { status: DonationStatus.CANCELLED },
        expect.anything(),
      );
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventId: sampleDonation.eventId,
          actorId: mockDonor.id,
          action: 'DONATION_CANCELLED',
          entityType: TransparencyEntityType.DONATION,
          oldStatus: DonationStatus.PENDING,
          newStatus: DonationStatus.CANCELLED,
          isPublic: false,
        }),
      );
    });

    it('throws NotFoundException if donation does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.cancelDonation(mockDonor.id, 'non-existent-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if user is not the donor', async () => {
      repository.findById.mockResolvedValue(sampleDonation); // donorId is mockDonor.id

      await expect(
        service.cancelDonation(mockOtherUser.id, sampleDonation.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if donation is not in PENDING status', async () => {
      repository.findById.mockResolvedValue({
        ...sampleDonation,
        status: DonationStatus.RECEIVED,
      });

      await expect(
        service.cancelDonation(mockDonor.id, sampleDonation.id),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
