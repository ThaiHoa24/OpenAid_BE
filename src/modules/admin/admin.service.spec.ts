import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { AdminService } from './admin.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';
import {
  EventStatus,
  OrgStatus,
  SystemRole,
  TransparencyEntityType,
} from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('AdminService (ADM-01 .. ADM-06)', () => {
  let service: AdminService;
  let prisma: any;
  let transparencyRepo: any;

  const mockAdmin: AuthenticatedUser = {
    id: 'admin-uuid-1',
    email: 'admin@openaid.demo',
    fullName: 'Platform Admin',
    systemRole: SystemRole.ADMIN,
  };

  beforeEach(() => {
    prisma = {
      $transaction: vi.fn((cb) => cb(prisma)),
      organization: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      user: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
      event: {
        findMany: vi.fn().mockResolvedValue([]),
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    };

    transparencyRepo = {
      append: vi.fn().mockResolvedValue({ id: 'log-1' }),
    };

    service = new AdminService(
      prisma as unknown as PrismaService,
      transparencyRepo as unknown as TransparencyRepository,
    );
  });

  it('ADM-01: lists pending organizations', async () => {
    await service.getPendingOrganizations({ skip: 0, take: 10 });
    expect(prisma.organization.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { status: OrgStatus.PENDING },
        skip: 0,
        take: 10,
      }),
    );
  });

  it('ADM-02: reviews organization and appends transparency audit log', async () => {
    prisma.organization.findUnique.mockResolvedValue({
      id: 'org-1',
      name: 'Hội Cứu Trợ',
      code: 'HCT-01',
      status: OrgStatus.PENDING,
    });
    prisma.organization.update.mockResolvedValue({
      id: 'org-1',
      status: OrgStatus.APPROVED,
    });

    const res = await service.reviewOrganization(mockAdmin, 'org-1', {
      status: OrgStatus.APPROVED,
    });

    expect(res.status).toBe(OrgStatus.APPROVED);
    expect(transparencyRepo.append).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        actorId: mockAdmin.id,
        action: 'ORGANIZATION_REVIEWED',
        entityType: TransparencyEntityType.ORGANIZATION,
        entityId: 'org-1',
        oldStatus: OrgStatus.PENDING,
        newStatus: OrgStatus.APPROVED,
      }),
    );
  });

  it('ADM-04: prevents admin from locking their own account', async () => {
    await expect(
      service.toggleUserActive(mockAdmin, mockAdmin.id, { isActive: false }),
    ).rejects.toThrow(BadRequestException);
  });

  it('ADM-04: toggles active status of another user', async () => {
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-2',
      email: 'user@openaid.demo',
      isActive: true,
    });
    prisma.user.update.mockResolvedValue({
      id: 'user-2',
      email: 'user@openaid.demo',
      isActive: false,
    });

    const res = await service.toggleUserActive(mockAdmin, 'user-2', {
      isActive: false,
    });
    expect(res.isActive).toBe(false);
  });

  it('ADM-05: filters events by search, organizationId, and normalized status', async () => {
    await service.getAllEvents({
      skip: 0,
      take: 20,
      search: 'Hòa Vang',
      organizationId: 'org-1',
      status: 'COMPLETED',
    });

    expect(prisma.event.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          organizationId: 'org-1',
          status: EventStatus.CLOSED,
        }),
      }),
    );
  });

  it('ADM-06: moderates event status (SUSPENDED -> CLOSED) and records audit log', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'ev-1',
      status: EventStatus.PUBLISHED,
      organization: { id: 'org-1', status: OrgStatus.APPROVED },
    });
    prisma.event.update.mockResolvedValue({
      id: 'ev-1',
      status: EventStatus.CLOSED,
    });

    const res = await service.moderateEventStatus(mockAdmin, 'ev-1', {
      status: 'SUSPENDED',
      reason: 'Kiểm tra định kỳ',
    });

    expect(res.status).toBe(EventStatus.CLOSED);
    expect(transparencyRepo.append).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        eventId: 'ev-1',
        action: 'EVENT_SUSPENDED_BY_ADMIN',
        oldStatus: EventStatus.PUBLISHED,
        newStatus: EventStatus.CLOSED,
      }),
    );
  });

  it('ADM-06: blocks publishing event if organization is not APPROVED', async () => {
    prisma.event.findUnique.mockResolvedValue({
      id: 'ev-1',
      status: EventStatus.DRAFT,
      organization: { id: 'org-1', status: OrgStatus.PENDING },
    });

    await expect(
      service.moderateEventStatus(mockAdmin, 'ev-1', {
        status: EventStatus.PUBLISHED,
      }),
    ).rejects.toThrow(ForbiddenException);
  });

  it('ADM-06: throws NotFoundException when moderating non-existent event', async () => {
    prisma.event.findUnique.mockResolvedValue(null);
    await expect(
      service.moderateEventStatus(mockAdmin, 'missing', {
        status: EventStatus.CANCELLED,
      }),
    ).rejects.toThrow(NotFoundException);
  });
});
