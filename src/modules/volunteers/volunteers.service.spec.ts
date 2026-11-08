import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { VolunteersService } from './volunteers.service.js';
import { VolunteersRepository } from './volunteers.repository.js';
import {
  EventStatus,
  SystemRole,
  TransparencyEntityType,
  VolunteerApplicationStatus,
} from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('VolunteersService', () => {
  let service: VolunteersService;
  let repository: any;
  let prisma: any;
  let organizationAccessService: any;
  let transparencyRepo: any;

  const mockVolunteer: AuthenticatedUser = {
    id: 'user-vol-1',
    email: 'volunteer@test.com',
    fullName: 'Test Volunteer',
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

  const sampleRole = {
    id: 'role-uuid-1',
    eventId: sampleEvent.id,
    name: 'Logistics Volunteer',
    quantity: 5,
  };

  const sampleApplication = {
    id: 'app-uuid-1',
    eventId: sampleEvent.id,
    userId: mockVolunteer.id,
    volunteerRoleId: sampleRole.id,
    status: VolunteerApplicationStatus.PENDING,
    notes: 'I have a truck',
    event: sampleEvent,
    volunteerRole: sampleRole,
    user: {
      id: mockVolunteer.id,
      fullName: mockVolunteer.fullName,
      email: mockVolunteer.email,
    },
    attendance: null,
  };

  beforeEach(() => {
    repository = {
      findRole: vi.fn(),
      findExistingApplication: vi.fn(),
      countApprovedApplicationsByRole: vi.fn().mockResolvedValue(0),
      create: vi.fn(),
      findById: vi.fn(),
      findMyApplications: vi.fn(),
      findEventApplications: vi.fn(),
      update: vi.fn(),
      upsertAttendanceCheckIn: vi.fn(),
      updateAttendanceCheckOut: vi.fn(),
    };

    prisma = {
      event: {
        findUnique: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };

    organizationAccessService = {
      requireEventOrganizer: vi.fn().mockResolvedValue(undefined),
    };

    transparencyRepo = {
      append: vi.fn().mockResolvedValue(undefined),
    };

    service = new VolunteersService(
      repository as unknown as VolunteersRepository,
      prisma,
      organizationAccessService,
      transparencyRepo,
    );
  });

  describe('registerVolunteer (VOL-01)', () => {
    it('successfully registers an application and logs transparency event', async () => {
      prisma.event.findUnique.mockResolvedValue(sampleEvent);
      repository.findRole.mockResolvedValue(sampleRole);
      repository.findExistingApplication.mockResolvedValue(null);
      repository.countApprovedApplicationsByRole.mockResolvedValue(2);
      repository.create.mockResolvedValue({
        ...sampleApplication,
        id: 'new-app-id',
      });

      const result = await service.registerVolunteer(mockVolunteer.id, {
        eventId: sampleEvent.id,
        volunteerRoleId: sampleRole.id,
        notes: ' Ready to help ',
      });

      expect(result.id).toBe('new-app-id');
      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          eventId: sampleEvent.id,
          userId: mockVolunteer.id,
          volunteerRoleId: sampleRole.id,
          status: VolunteerApplicationStatus.PENDING,
          notes: 'Ready to help',
        }),
        expect.anything(),
      );
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventId: sampleEvent.id,
          actorId: mockVolunteer.id,
          action: 'VOLUNTEER_APPLIED',
          entityType: TransparencyEntityType.VOLUNTEER_APPLICATION,
          newStatus: VolunteerApplicationStatus.PENDING,
        }),
      );
    });

    it('throws NotFoundException if event does not exist', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.registerVolunteer(mockVolunteer.id, {
          eventId: 'non-existent-event',
          volunteerRoleId: sampleRole.id,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if event is not PUBLISHED', async () => {
      prisma.event.findUnique.mockResolvedValue({
        ...sampleEvent,
        status: EventStatus.DRAFT,
      });

      await expect(
        service.registerVolunteer(mockVolunteer.id, {
          eventId: sampleEvent.id,
          volunteerRoleId: sampleRole.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if volunteer role does not belong to event', async () => {
      prisma.event.findUnique.mockResolvedValue(sampleEvent);
      repository.findRole.mockResolvedValue(null);

      await expect(
        service.registerVolunteer(mockVolunteer.id, {
          eventId: sampleEvent.id,
          volunteerRoleId: 'foreign-role-id',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ConflictException if user already applied to this event', async () => {
      prisma.event.findUnique.mockResolvedValue(sampleEvent);
      repository.findRole.mockResolvedValue(sampleRole);
      repository.findExistingApplication.mockResolvedValue(sampleApplication);

      await expect(
        service.registerVolunteer(mockVolunteer.id, {
          eventId: sampleEvent.id,
          volunteerRoleId: sampleRole.id,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it('throws BadRequestException if volunteer role capacity is already reached', async () => {
      prisma.event.findUnique.mockResolvedValue(sampleEvent);
      repository.findRole.mockResolvedValue(sampleRole); // quantity: 5
      repository.findExistingApplication.mockResolvedValue(null);
      repository.countApprovedApplicationsByRole.mockResolvedValue(5);

      await expect(
        service.registerVolunteer(mockVolunteer.id, {
          eventId: sampleEvent.id,
          volunteerRoleId: sampleRole.id,
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('getEventVolunteers (VOL-03)', () => {
    it('returns event applications for verified organizer', async () => {
      prisma.event.findUnique.mockResolvedValue(sampleEvent);
      repository.findEventApplications.mockResolvedValue([sampleApplication]);

      const result = await service.getEventVolunteers(
        mockOrganizer,
        sampleEvent.id,
      );

      expect(result).toHaveLength(1);
      expect(
        organizationAccessService.requireEventOrganizer,
      ).toHaveBeenCalledWith(mockOrganizer.id, sampleEvent.id);
    });

    it('allows ADMIN to view applications without calling requireEventOrganizer', async () => {
      prisma.event.findUnique.mockResolvedValue(sampleEvent);
      repository.findEventApplications.mockResolvedValue([sampleApplication]);

      const result = await service.getEventVolunteers(
        mockAdmin,
        sampleEvent.id,
      );

      expect(result).toHaveLength(1);
      expect(
        organizationAccessService.requireEventOrganizer,
      ).not.toHaveBeenCalled();
    });

    it('throws NotFoundException if event not found', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.getEventVolunteers(mockOrganizer, 'unknown-id'),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws ForbiddenException if non-organizer tries to view', async () => {
      prisma.event.findUnique.mockResolvedValue(sampleEvent);
      organizationAccessService.requireEventOrganizer.mockRejectedValue(
        new ForbiddenException('Access denied'),
      );

      await expect(
        service.getEventVolunteers(mockOtherUser, sampleEvent.id),
      ).rejects.toThrow(ForbiddenException);
    });
  });

  describe('reviewApplication (VOL-04)', () => {
    it('approves an application when capacity is available and logs transparency event', async () => {
      repository.findById.mockResolvedValue(sampleApplication);
      repository.countApprovedApplicationsByRole.mockResolvedValue(3); // quantity is 5
      repository.update.mockResolvedValue({
        ...sampleApplication,
        status: VolunteerApplicationStatus.APPROVED,
        reviewedById: mockOrganizer.id,
      });

      const result = await service.reviewApplication(
        mockOrganizer,
        sampleApplication.id,
        {
          status: VolunteerApplicationStatus.APPROVED,
        },
      );

      expect(result.status).toBe(VolunteerApplicationStatus.APPROVED);
      expect(
        organizationAccessService.requireEventOrganizer,
      ).toHaveBeenCalledWith(mockOrganizer.id, sampleEvent.id);
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          eventId: sampleEvent.id,
          actorId: mockOrganizer.id,
          action: 'VOLUNTEER_APPROVED',
          oldStatus: VolunteerApplicationStatus.PENDING,
          newStatus: VolunteerApplicationStatus.APPROVED,
        }),
      );
    });

    it('rejects an application without checking capacity and logs transparency event', async () => {
      repository.findById.mockResolvedValue(sampleApplication);
      repository.update.mockResolvedValue({
        ...sampleApplication,
        status: VolunteerApplicationStatus.REJECTED,
      });

      const result = await service.reviewApplication(
        mockOrganizer,
        sampleApplication.id,
        {
          status: VolunteerApplicationStatus.REJECTED,
        },
      );

      expect(result.status).toBe(VolunteerApplicationStatus.REJECTED);
      expect(repository.countApprovedApplicationsByRole).not.toHaveBeenCalled();
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'VOLUNTEER_REJECTED',
          newStatus: VolunteerApplicationStatus.REJECTED,
        }),
      );
    });

    it('throws BadRequestException when approving if role capacity is full', async () => {
      repository.findById.mockResolvedValue(sampleApplication);
      repository.countApprovedApplicationsByRole.mockResolvedValue(5); // quantity is 5

      await expect(
        service.reviewApplication(mockOrganizer, sampleApplication.id, {
          status: VolunteerApplicationStatus.APPROVED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws NotFoundException if application does not exist', async () => {
      repository.findById.mockResolvedValue(null);

      await expect(
        service.reviewApplication(mockOrganizer, 'non-existent-id', {
          status: VolunteerApplicationStatus.APPROVED,
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('allows ADMIN to review application without organizer membership', async () => {
      repository.findById.mockResolvedValue(sampleApplication);
      repository.countApprovedApplicationsByRole.mockResolvedValue(2);
      repository.update.mockResolvedValue({
        ...sampleApplication,
        status: VolunteerApplicationStatus.APPROVED,
      });

      await service.reviewApplication(mockAdmin, sampleApplication.id, {
        status: VolunteerApplicationStatus.APPROVED,
      });

      expect(
        organizationAccessService.requireEventOrganizer,
      ).not.toHaveBeenCalled();
    });
  });

  describe('getMyApplications (VOL-02)', () => {
    it('returns applications belonging to user', async () => {
      repository.findMyApplications.mockResolvedValue([sampleApplication]);

      const result = await service.getMyApplications(mockVolunteer.id);

      expect(result).toHaveLength(1);
      expect(repository.findMyApplications).toHaveBeenCalledWith(
        mockVolunteer.id,
      );
    });
  });

  describe('checkIn (VOL-05)', () => {
    const approvedApplication = {
      ...sampleApplication,
      status: VolunteerApplicationStatus.APPROVED,
      attendance: null,
    };

    it('allows volunteer themselves to check in via confirmation button', async () => {
      repository.findById.mockResolvedValue(approvedApplication);
      const mockAttendance = {
        id: 'att-1',
        applicationId: approvedApplication.id,
        checkedInAt: new Date(),
        checkedInById: mockVolunteer.id,
        method: 'MANUAL',
      };
      repository.upsertAttendanceCheckIn.mockResolvedValue(mockAttendance);

      const result = await service.checkIn(
        mockVolunteer,
        approvedApplication.id,
      );

      expect(result.id).toBe('att-1');
      expect(repository.upsertAttendanceCheckIn).toHaveBeenCalledWith(
        approvedApplication.id,
        mockVolunteer.id,
        expect.anything(),
      );
      expect(
        organizationAccessService.requireEventOrganizer,
      ).not.toHaveBeenCalled();
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'VOLUNTEER_CHECKED_IN',
          actorId: mockVolunteer.id,
        }),
      );
    });

    it('allows event organizer to check in on behalf of volunteer', async () => {
      repository.findById.mockResolvedValue(approvedApplication);
      repository.upsertAttendanceCheckIn.mockResolvedValue({ id: 'att-1' });

      await service.checkIn(mockOrganizer, approvedApplication.id);

      expect(
        organizationAccessService.requireEventOrganizer,
      ).toHaveBeenCalledWith(mockOrganizer.id, sampleEvent.id);
    });

    it('allows ADMIN to check in without organizer check', async () => {
      repository.findById.mockResolvedValue(approvedApplication);
      repository.upsertAttendanceCheckIn.mockResolvedValue({ id: 'att-1' });

      await service.checkIn(mockAdmin, approvedApplication.id);

      expect(
        organizationAccessService.requireEventOrganizer,
      ).not.toHaveBeenCalled();
    });

    it('throws ForbiddenException if unauthorized third-party attempts check in', async () => {
      repository.findById.mockResolvedValue(approvedApplication);
      organizationAccessService.requireEventOrganizer.mockRejectedValue(
        new ForbiddenException('Not organizer'),
      );

      await expect(
        service.checkIn(mockOtherUser, approvedApplication.id),
      ).rejects.toThrow(ForbiddenException);
    });

    it('throws BadRequestException if application is not APPROVED', async () => {
      repository.findById.mockResolvedValue(sampleApplication); // status is PENDING

      await expect(
        service.checkIn(mockVolunteer, sampleApplication.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if event is CANCELLED', async () => {
      repository.findById.mockResolvedValue({
        ...approvedApplication,
        event: { ...sampleEvent, status: EventStatus.CANCELLED },
      });

      await expect(
        service.checkIn(mockVolunteer, approvedApplication.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if volunteer has already checked in', async () => {
      repository.findById.mockResolvedValue({
        ...approvedApplication,
        attendance: { checkedInAt: new Date() },
      });

      await expect(
        service.checkIn(mockVolunteer, approvedApplication.id),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('checkOut (VOL-06)', () => {
    const checkedInApplication = {
      ...sampleApplication,
      status: VolunteerApplicationStatus.APPROVED,
      attendance: {
        checkedInAt: new Date('2026-11-10T08:00:00Z'),
        checkedOutAt: null,
      },
    };

    it('allows volunteer themselves to check out via confirmation button', async () => {
      repository.findById.mockResolvedValue(checkedInApplication);
      const mockUpdatedAttendance = {
        id: 'att-1',
        applicationId: checkedInApplication.id,
        checkedInAt: checkedInApplication.attendance.checkedInAt,
        checkedOutAt: new Date(),
        checkedOutById: mockVolunteer.id,
      };
      repository.updateAttendanceCheckOut.mockResolvedValue(
        mockUpdatedAttendance,
      );

      const result = await service.checkOut(
        mockVolunteer,
        checkedInApplication.id,
      );

      expect(result.checkedOutById).toBe(mockVolunteer.id);
      expect(repository.updateAttendanceCheckOut).toHaveBeenCalledWith(
        checkedInApplication.id,
        mockVolunteer.id,
        expect.anything(),
      );
      expect(transparencyRepo.append).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          action: 'VOLUNTEER_CHECKED_OUT',
          actorId: mockVolunteer.id,
        }),
      );
    });

    it('allows event organizer to check out on behalf of volunteer', async () => {
      repository.findById.mockResolvedValue(checkedInApplication);
      repository.updateAttendanceCheckOut.mockResolvedValue({ id: 'att-1' });

      await service.checkOut(mockOrganizer, checkedInApplication.id);

      expect(
        organizationAccessService.requireEventOrganizer,
      ).toHaveBeenCalledWith(mockOrganizer.id, sampleEvent.id);
    });

    it('throws BadRequestException if volunteer is not checked in yet', async () => {
      repository.findById.mockResolvedValue({
        ...checkedInApplication,
        attendance: null,
      });

      await expect(
        service.checkOut(mockVolunteer, checkedInApplication.id),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if volunteer already checked out', async () => {
      repository.findById.mockResolvedValue({
        ...checkedInApplication,
        attendance: {
          checkedInAt: new Date(),
          checkedOutAt: new Date(),
        },
      });

      await expect(
        service.checkOut(mockVolunteer, checkedInApplication.id),
      ).rejects.toThrow(BadRequestException);
    });
  });
});
