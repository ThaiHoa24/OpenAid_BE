import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { AdminService } from './admin.service.js';
import {
  EventStatus,
  SystemRole,
  TransparencyEntityType,
} from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('AdminService - ADM-05 & ADM-06', () => {
  let service: AdminService;
  let prisma: any;

  const adminActor: AuthenticatedUser = {
    id: 'admin-uuid-1',
    email: 'admin@openaid.test',
    systemRole: SystemRole.ADMIN,
  };

  const sampleEvent = {
    id: 'event-uuid-1',
    organizationId: 'org-uuid-1',
    createdById: 'user-uuid-1',
    title: 'Cứu trợ lũ lụt miền Trung',
    description: 'Chiến dịch hỗ trợ khẩn cấp',
    location: 'Đà Nẵng',
    contactName: 'Nguyễn Văn A',
    contactPhone: '0901234567',
    startDate: new Date('2026-11-10T08:00:00Z'),
    endDate: new Date('2026-11-20T18:00:00Z'),
    status: EventStatus.PUBLISHED,
    moderationReason: null,
    createdAt: new Date('2026-11-01T00:00:00Z'),
    updatedAt: new Date('2026-11-01T00:00:00Z'),
    organization: {
      id: 'org-uuid-1',
      name: 'Quỹ Cứu trợ Miền Trung',
      code: 'QCTMT',
      status: 'APPROVED',
      email: 'contact@qctmt.org',
      phoneNumber: '0236123456',
    },
    volunteerRoles: [
      { id: 'vr-1', name: 'Bốc vác', quantity: 10, description: null },
      { id: 'vr-2', name: 'Phát quà', quantity: 5, description: null },
    ],
    donationNeeds: [],
    _count: {
      donations: 25,
      trips: 3,
      volunteerApplications: 12,
    },
  };

  beforeEach(() => {
    prisma = {
      event: {
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn(),
      },
      transparencyLog: {
        create: vi.fn(),
      },
      $transaction: vi.fn(async (cb: (tx: any) => Promise<any>) => cb(prisma)),
    };

    service = new AdminService(prisma);
  });

  describe('ADM-05: getAdminEvents', () => {
    it('returns paginated events with enriched counters', async () => {
      prisma.event.count.mockResolvedValue(1);
      prisma.event.findMany.mockResolvedValue([sampleEvent]);

      const result = await service.getAdminEvents({
        page: 1,
        limit: 10,
      });

      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
      expect(result.totalPages).toBe(1);
      expect(result.items).toHaveLength(1);
      expect(result.items[0].donationsCount).toBe(25);
      expect(result.items[0].tripsCount).toBe(3);
      expect(result.items[0].applicationsCount).toBe(12);
      expect(result.items[0].totalRequiredVolunteers).toBe(15);
    });

    it('filters by status and organizationId and search term', async () => {
      prisma.event.count.mockResolvedValue(1);
      prisma.event.findMany.mockResolvedValue([sampleEvent]);

      await service.getAdminEvents({
        status: EventStatus.PUBLISHED,
        organizationId: 'org-uuid-1',
        search: 'Lũ lụt',
      });

      expect(prisma.event.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: EventStatus.PUBLISHED,
            organizationId: 'org-uuid-1',
            OR: expect.arrayContaining([
              { title: { contains: 'Lũ lụt', mode: 'insensitive' } },
            ]),
          }),
        }),
      );
    });
  });

  describe('ADM-06: moderateEventStatus', () => {
    it('throws NotFoundException when event does not exist', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(
        service.moderateEventStatus(adminActor, 'missing-id', {
          status: EventStatus.SUSPENDED,
          reason: 'Nghi vấn gian lận',
        }),
      ).rejects.toThrow(NotFoundException);
    });

    it('throws BadRequestException if status is not SUSPENDED or CANCELLED', async () => {
      prisma.event.findUnique.mockResolvedValue(sampleEvent);

      await expect(
        service.moderateEventStatus(adminActor, sampleEvent.id, {
          status: EventStatus.DRAFT,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('throws BadRequestException if event is already in the target status', async () => {
      prisma.event.findUnique.mockResolvedValue({
        ...sampleEvent,
        status: EventStatus.SUSPENDED,
      });

      await expect(
        service.moderateEventStatus(adminActor, sampleEvent.id, {
          status: EventStatus.SUSPENDED,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('successfully suspends an event and writes audit log to transparencyLog', async () => {
      prisma.event.findUnique.mockResolvedValue(sampleEvent);
      prisma.event.update.mockResolvedValue({
        ...sampleEvent,
        status: EventStatus.SUSPENDED,
        moderationReason: 'Nghi vấn phân phối sai lệch',
      });

      const result = await service.moderateEventStatus(adminActor, sampleEvent.id, {
        status: EventStatus.SUSPENDED,
        reason: 'Nghi vấn phân phối sai lệch',
      });

      expect(prisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleEvent.id },
          data: {
            status: EventStatus.SUSPENDED,
            moderationReason: 'Nghi vấn phân phối sai lệch',
          },
        }),
      );

      expect(prisma.transparencyLog.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            eventId: sampleEvent.id,
            action: 'EVENT_MODERATED',
            entityType: TransparencyEntityType.EVENT,
            oldStatus: EventStatus.PUBLISHED,
            newStatus: EventStatus.SUSPENDED,
            actorId: adminActor.id,
          }),
        }),
      );

      expect(result.status).toBe(EventStatus.SUSPENDED);
    });

    it('successfully forcibly cancels an event with reason', async () => {
      prisma.event.findUnique.mockResolvedValue(sampleEvent);
      prisma.event.update.mockResolvedValue({
        ...sampleEvent,
        status: EventStatus.CANCELLED,
        moderationReason: 'Vi phạm nghiêm trọng quy chuẩn cứu trợ',
      });

      const result = await service.moderateEventStatus(adminActor, sampleEvent.id, {
        status: EventStatus.CANCELLED,
        reason: 'Vi phạm nghiêm trọng quy chuẩn cứu trợ',
      });

      expect(prisma.event.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: sampleEvent.id },
          data: {
            status: EventStatus.CANCELLED,
            moderationReason: 'Vi phạm nghiêm trọng quy chuẩn cứu trợ',
          },
        }),
      );
      expect(result.status).toBe(EventStatus.CANCELLED);
    });
  });
});

