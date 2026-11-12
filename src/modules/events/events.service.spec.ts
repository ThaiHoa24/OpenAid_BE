import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventsService } from './events.service.js';
import { EventsRepository } from './events.repository.js';
import {
  EventStatus,
  OrgStatus,
  OrganizationRole,
  SystemRole,
} from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('EventsService', () => {
  let service: EventsService;
  let repository: EventsRepository;
  let prisma: any;
  let organizationAccessService: any;
  let transparencyRepo: any;

  const mockActor: AuthenticatedUser = {
    id: 'user-uuid-1',
    email: 'organizer@test.com',
    fullName: 'Test Organizer',
    systemRole: SystemRole.USER,
  };

  const sampleEvent = {
    id: 'event-uuid-1',
    organizationId: 'org-uuid-1',
    createdById: mockActor.id,
    title: 'Support Flooded Areas',
    description: 'Help needed',
    location: 'Hoa Vang, Da Nang',
    contactName: 'Nguyen Van A',
    contactPhone: '0901234567',
    startDate: new Date('2026-11-10T08:00:00Z'),
    endDate: new Date('2026-11-12T18:00:00Z'),
    status: EventStatus.DRAFT,
    volunteerRoles: [],
    donationNeeds: [],
  };

  beforeEach(() => {
    repository = {
      findById: vi.fn(),
      findMany: vi.fn(),
      count: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      deleteVolunteerRoles: vi.fn(),
      deleteDonationNeeds: vi.fn(),
      validateItemTypes: vi.fn(),
      validateUnits: vi.fn(),
      findActiveItemTypes: vi.fn(),
      findActiveUnits: vi.fn(),
      findDonationNeedsByEventId: vi.fn(),
      findDonationNeedById: vi.fn(),
      createDonationNeed: vi.fn(),
      deleteDonationNeed: vi.fn(),
      updateDonationNeed: vi.fn(),
      findVolunteerRolesByEventId: vi.fn(),
      findVolunteerRoleById: vi.fn(),
      createVolunteerRole: vi.fn(),
      updateVolunteerRole: vi.fn(),
      deleteVolunteerRole: vi.fn(),
    } as unknown as EventsRepository;

    prisma = {
      $transaction: vi.fn((cb) => cb(prisma)),
      volunteerApplication: { count: vi.fn().mockResolvedValue(0) },
      donation: { count: vi.fn().mockResolvedValue(0) },
      batch: { count: vi.fn().mockResolvedValue(0) },
      trip: { count: vi.fn().mockResolvedValue(0) },
      volunteerRole: { create: vi.fn() },
      donationNeed: { create: vi.fn() },
    };

    organizationAccessService = {
      requireOrganizer: vi.fn(),
      requireApprovedOrganizer: vi.fn(),
    };

    transparencyRepo = {
      append: vi.fn().mockResolvedValue({ id: 'log-uuid-1' }),
    };

    service = new EventsService(
      repository,
      prisma,
      organizationAccessService,
      transparencyRepo,
    );
  });

  describe('US-07 & US-08: createEvent', () => {
    it('successfully creates a DRAFT event with roles and donation needs', async () => {
      organizationAccessService.requireOrganizer.mockResolvedValue({
        id: 'membership-1',
        role: OrganizationRole.ORGANIZER,
      });

      vi.spyOn(repository, 'validateItemTypes').mockResolvedValue([
        { id: 'item-1' },
      ]);
      vi.spyOn(repository, 'validateUnits').mockResolvedValue([
        { id: 'unit-1' },
      ]);
      vi.spyOn(repository, 'create').mockResolvedValue(sampleEvent as any);

      const result = await service.createEvent(mockActor, {
        organizationId: 'org-uuid-1',
        title: 'Support Flooded Areas',
        location: 'Hoa Vang, Da Nang',
        contactName: 'Nguyen Van A',
        startDate: '2026-11-10T08:00:00Z',
        endDate: '2026-11-12T18:00:00Z',
        volunteerRoles: [
          { name: 'Transport', quantity: 5, description: 'Drive vans' },
        ],
        donationNeeds: [
          { itemTypeId: 'item-1', unitId: 'unit-1', targetQuantity: 100 },
        ],
      });

      expect(organizationAccessService.requireOrganizer).toHaveBeenCalledWith(
        mockActor.id,
        'org-uuid-1',
      );
      expect(repository.create).toHaveBeenCalled();
      expect(result.status).toBe(EventStatus.DRAFT);
    });

    it('throws ForbiddenException if caller is not an organizer of the organization', async () => {
      organizationAccessService.requireOrganizer.mockRejectedValue(
        new ForbiddenException(
          'Organizer permission is required for this organization',
        ),
      );

      await expect(
        service.createEvent(mockActor, {
          organizationId: 'org-uuid-1',
          title: 'Unauthorized Event',
          location: 'Da Nang',
          contactName: 'Test',
          startDate: '2026-11-10T08:00:00Z',
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if startDate >= endDate', async () => {
      organizationAccessService.requireOrganizer.mockResolvedValue({});

      await expect(
        service.createEvent(mockActor, {
          organizationId: 'org-uuid-1',
          title: 'Invalid Dates Event',
          location: 'Da Nang',
          contactName: 'Test',
          startDate: '2026-11-15T08:00:00Z',
          endDate: '2026-11-10T08:00:00Z',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if volunteer role names are duplicated', async () => {
      organizationAccessService.requireOrganizer.mockResolvedValue({});

      await expect(
        service.createEvent(mockActor, {
          organizationId: 'org-uuid-1',
          title: 'Duplicate Roles Event',
          location: 'Da Nang',
          contactName: 'Test',
          startDate: '2026-11-10T08:00:00Z',
          volunteerRoles: [
            { name: 'Logistics', quantity: 2 },
            { name: 'logistics', quantity: 3 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if donation needs itemType and unit combination is duplicated', async () => {
      organizationAccessService.requireOrganizer.mockResolvedValue({});

      await expect(
        service.createEvent(mockActor, {
          organizationId: 'org-uuid-1',
          title: 'Duplicate Needs Event',
          location: 'Da Nang',
          contactName: 'Test',
          startDate: '2026-11-10T08:00:00Z',
          donationNeeds: [
            { itemTypeId: 'item-1', unitId: 'unit-1', targetQuantity: 10 },
            { itemTypeId: 'item-1', unitId: 'unit-1', targetQuantity: 20 },
          ],
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('US-09: changeStatus (Publish Event)', () => {
    it('successfully publishes a DRAFT event when organization is APPROVED and logs audit trail', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(sampleEvent as any);
      vi.spyOn(repository, 'update').mockResolvedValue({
        ...sampleEvent,
        status: EventStatus.PUBLISHED,
      } as any);

      organizationAccessService.requireApprovedOrganizer.mockResolvedValue({
        organization: { status: OrgStatus.APPROVED },
      });

      const updated = await service.changeStatus(mockActor, sampleEvent.id, {
        status: EventStatus.PUBLISHED,
      });

      expect(
        organizationAccessService.requireApprovedOrganizer,
      ).toHaveBeenCalledWith(mockActor.id, sampleEvent.organizationId);
      expect(repository.update).toHaveBeenCalledWith(
        sampleEvent.id,
        { status: EventStatus.PUBLISHED },
        expect.anything(),
      );
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'EVENT_STATUS_CHANGED',
          oldStatus: EventStatus.DRAFT,
          newStatus: EventStatus.PUBLISHED,
        }),
      );
      expect(updated.status).toBe(EventStatus.PUBLISHED);
    });

    it('rejects publishing if organization is not approved (throws ForbiddenException)', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(sampleEvent as any);
      organizationAccessService.requireApprovedOrganizer.mockRejectedValue(
        new ForbiddenException(
          'The organization must be approved before publishing events',
        ),
      );

      await expect(
        service.changeStatus(mockActor, sampleEvent.id, {
          status: EventStatus.PUBLISHED,
        }),
      ).rejects.toThrow(ForbiddenException);
    });

    it('rejects illegal transition from CLOSED to PUBLISHED', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue({
        ...sampleEvent,
        status: EventStatus.CLOSED,
      } as any);

      await expect(
        service.changeStatus(mockActor, sampleEvent.id, {
          status: EventStatus.PUBLISHED,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('US-10: getAllEvents & getEventById', () => {
    it('discovers published events with filters', async () => {
      vi.spyOn(repository, 'findMany').mockResolvedValue([sampleEvent] as any);

      const events = await service.getAllEvents({
        search: 'Hoa Vang',
        area: 'Da Nang',
        skip: 0,
        take: 10,
      });

      expect(repository.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
          }),
        }),
      );
      expect(events).toEqual([sampleEvent]);
    });

    it('returns event by id when found', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(sampleEvent as any);

      const event = await service.getEventById(sampleEvent.id);
      expect(event).toEqual(sampleEvent);
    });

    it('throws NotFoundException when event id does not exist', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(null);

      await expect(service.getEventById('non-existent-id')).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('deleteDraft', () => {
    it('successfully deletes a DRAFT event', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(sampleEvent as any);
      vi.spyOn(repository, 'deleteVolunteerRoles').mockResolvedValue({
        count: 0,
      } as any);
      vi.spyOn(repository, 'deleteDonationNeeds').mockResolvedValue({
        count: 0,
      } as any);
      vi.spyOn(repository, 'delete').mockResolvedValue(sampleEvent as any);

      const result = await service.deleteDraft(mockActor, sampleEvent.id);
      expect(result.id).toBe(sampleEvent.id);
    });

    it('throws BadRequestException when trying to delete a PUBLISHED event', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue({
        ...sampleEvent,
        status: EventStatus.PUBLISHED,
      } as any);

      await expect(
        service.deleteDraft(mockActor, sampleEvent.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('KAN-17: Catalogs and Donation Needs Management', () => {
    it('returns active item types and units catalogs', async () => {
      vi.spyOn(repository, 'findActiveItemTypes').mockResolvedValue([
        {
          id: 'item-1',
          code: 'RICE',
          name: 'Rice',
          category: 'Food',
          isActive: true,
        },
      ] as any);
      vi.spyOn(repository, 'findActiveUnits').mockResolvedValue([
        { id: 'unit-1', code: 'KG', name: 'Kilogram', isActive: true },
      ] as any);

      const items = await service.getActiveItemTypes();
      const units = await service.getActiveUnits();

      expect(items).toHaveLength(1);
      expect(items[0].code).toBe('RICE');
      expect(units).toHaveLength(1);
      expect(units[0].code).toBe('KG');
    });

    it('returns donation needs for an existing event', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(sampleEvent as any);
      vi.spyOn(repository, 'findDonationNeedsByEventId').mockResolvedValue([
        { id: 'need-1', eventId: sampleEvent.id, targetQuantity: 100 } as any,
      ]);

      const needs = await service.getDonationNeeds(sampleEvent.id);
      expect(needs).toHaveLength(1);
      expect(needs[0].id).toBe('need-1');
    });

    it('successfully adds a donation need to a DRAFT event', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(sampleEvent as any);
      organizationAccessService.requireOrganizer.mockResolvedValue({
        id: 'm1',
      });
      vi.spyOn(repository, 'validateItemTypes').mockResolvedValue([
        { id: 'item-1' },
      ]);
      vi.spyOn(repository, 'validateUnits').mockResolvedValue([
        { id: 'unit-1' },
      ]);
      vi.spyOn(repository, 'findDonationNeedsByEventId').mockResolvedValue([]);
      vi.spyOn(repository, 'createDonationNeed').mockResolvedValue({
        id: 'new-need-1',
        eventId: sampleEvent.id,
        itemTypeId: 'item-1',
        unitId: 'unit-1',
      } as any);

      const result = await service.addDonationNeed(mockActor, sampleEvent.id, {
        itemTypeId: 'item-1',
        unitId: 'unit-1',
        targetQuantity: 50,
      });

      expect(result.id).toBe('new-need-1');
    });

    it('throws BadRequestException when adding donation need with duplicate item and unit', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(sampleEvent as any);
      organizationAccessService.requireOrganizer.mockResolvedValue({
        id: 'm1',
      });
      vi.spyOn(repository, 'validateItemTypes').mockResolvedValue([
        { id: 'item-1' },
      ]);
      vi.spyOn(repository, 'validateUnits').mockResolvedValue([
        { id: 'unit-1' },
      ]);
      vi.spyOn(repository, 'findDonationNeedsByEventId').mockResolvedValue([
        {
          id: 'need-1',
          eventId: sampleEvent.id,
          itemTypeId: 'item-1',
          unitId: 'unit-1',
        } as any,
      ]);

      await expect(
        service.addDonationNeed(mockActor, sampleEvent.id, {
          itemTypeId: 'item-1',
          unitId: 'unit-1',
          targetQuantity: 50,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully removes a donation need from a DRAFT event', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(sampleEvent as any);
      organizationAccessService.requireOrganizer.mockResolvedValue({
        id: 'm1',
      });
      vi.spyOn(repository, 'findDonationNeedById').mockResolvedValue({
        id: 'need-1',
        eventId: sampleEvent.id,
      } as any);
      prisma.donation.count.mockResolvedValue(0);
      vi.spyOn(repository, 'deleteDonationNeed').mockResolvedValue({
        id: 'need-1',
      } as any);

      const result = await service.removeDonationNeed(
        mockActor,
        sampleEvent.id,
        'need-1',
      );
      expect(result.id).toBe('need-1');
      expect(result.message).toContain('removed');
    });

    it('throws BadRequestException when removing a donation need that has existing donations', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(sampleEvent as any);
      organizationAccessService.requireOrganizer.mockResolvedValue({
        id: 'm1',
      });
      vi.spyOn(repository, 'findDonationNeedById').mockResolvedValue({
        id: 'need-1',
        eventId: sampleEvent.id,
      } as any);
      prisma.donation.count.mockResolvedValue(3);

      await expect(
        service.removeDonationNeed(mockActor, sampleEvent.id, 'need-1'),
      ).rejects.toThrow(BadRequestException);
    });

    it('EVT-SUB: updates an individual donation need targetQuantity', async () => {
      vi.spyOn(repository, 'findDonationNeedById').mockResolvedValue({
        id: 'need-1',
        eventId: sampleEvent.id,
        itemTypeId: 'item-1',
        unitId: 'unit-1',
        event: sampleEvent,
      } as any);
      organizationAccessService.requireOrganizer.mockResolvedValue({ id: 'm1' });
      vi.spyOn(repository, 'updateDonationNeed').mockResolvedValue({
        id: 'need-1',
        targetQuantity: 250,
      } as any);

      const updated = await service.updateDonationNeed(mockActor, 'need-1', {
        targetQuantity: 250,
        notes: 'Tăng định mức gạo',
      });
      expect(updated.targetQuantity).toBe(250);
    });

    it('EVT-SUB: adds, updates and deletes an individual volunteer role', async () => {
      vi.spyOn(repository, 'findById').mockResolvedValue(sampleEvent as any);
      organizationAccessService.requireOrganizer.mockResolvedValue({ id: 'm1' });
      vi.spyOn(repository, 'findVolunteerRolesByEventId').mockResolvedValue([]);
      vi.spyOn(repository, 'createVolunteerRole').mockResolvedValue({
        id: 'role-1',
        name: 'Tài xế xe tải',
        quantity: 4,
      } as any);

      const created = await service.addVolunteerRole(mockActor, sampleEvent.id, {
        name: 'Tài xế xe tải',
        quantity: 4,
      });
      expect(created.name).toBe('Tài xế xe tải');

      vi.spyOn(repository, 'findVolunteerRoleById').mockResolvedValue({
        id: 'role-1',
        eventId: sampleEvent.id,
        name: 'Tài xế xe tải',
        quantity: 4,
        event: sampleEvent,
      } as any);
      vi.spyOn(repository, 'updateVolunteerRole').mockResolvedValue({
        id: 'role-1',
        name: 'Tài xế xe tải',
        quantity: 6,
      } as any);

      const updatedRole = await service.updateVolunteerRole(
        mockActor,
        'role-1',
        { quantity: 6 },
      );
      expect(updatedRole.quantity).toBe(6);

      prisma.volunteerApplication.count.mockResolvedValue(0);
      vi.spyOn(repository, 'deleteVolunteerRole').mockResolvedValue({
        id: 'role-1',
      } as any);

      const deleted = await service.removeVolunteerRole(mockActor, 'role-1');
      expect(deleted.id).toBe('role-1');
    });
  });
});
