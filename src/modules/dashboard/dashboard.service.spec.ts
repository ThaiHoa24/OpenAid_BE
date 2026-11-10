import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import {
  DonationStatus,
  EventStatus,
  SystemRole,
  VolunteerApplicationStatus,
} from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('DashboardService (OA-S5-05 Event Dashboard & Progress Analytics)', () => {
  let service: DashboardService;
  let prisma: PrismaService;
  let orgAccess: OrganizationAccessService;

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

  const mockEventId = 'event-uuid-1';
  const mockItemTypeId = 'item-type-uuid-1';
  const mockUnitId = 'unit-uuid-1';
  const mockRoleId = 'role-uuid-1';

  const mockEvent = {
    id: mockEventId,
    title: 'Cứu trợ lũ lụt miền Trung',
    status: EventStatus.PUBLISHED,
    organization: { name: 'Hội Chữ Thập Đỏ' },
    donationNeeds: [
      {
        id: 'need-1',
        itemTypeId: mockItemTypeId,
        unitId: mockUnitId,
        targetQuantity: new Prisma.Decimal(100),
        itemType: { name: 'Gạo ST25' },
        unit: { name: 'Bao 10kg' },
      },
    ],
    volunteerRoles: [
      {
        id: mockRoleId,
        name: 'Hậu cần bốc xếp',
        quantity: 10,
      },
    ],
  };

  beforeEach(() => {
    prisma = {
      event: {
        findUnique: vi.fn(),
      },
      donation: {
        count: vi.fn().mockResolvedValue(5),
        findMany: vi.fn().mockResolvedValue([
          {
            itemTypeId: mockItemTypeId,
            unitId: mockUnitId,
            quantity: new Prisma.Decimal(20),
            status: DonationStatus.PENDING, // Pledged: 20
          },
          {
            itemTypeId: mockItemTypeId,
            unitId: mockUnitId,
            quantity: new Prisma.Decimal(30),
            status: DonationStatus.RECEIVED,
          },
        ]),
      },
      batch: {
        count: vi.fn().mockResolvedValue(2),
      },
      trip: {
        count: vi.fn().mockResolvedValue(1),
      },
      volunteerApplication: {
        count: vi.fn().mockResolvedValue(4),
        findMany: vi.fn().mockResolvedValue([
          {
            volunteerRoleId: mockRoleId,
            status: VolunteerApplicationStatus.APPROVED,
          },
          {
            volunteerRoleId: mockRoleId,
            status: VolunteerApplicationStatus.APPROVED,
          },
          {
            volunteerRoleId: mockRoleId,
            status: VolunteerApplicationStatus.PENDING,
          },
          {
            volunteerRoleId: mockRoleId,
            status: VolunteerApplicationStatus.REJECTED,
          },
        ]),
      },
      inventory: {
        findMany: vi.fn().mockResolvedValue([
          {
            itemTypeId: mockItemTypeId,
            unitId: mockUnitId,
            itemType: { name: 'Gạo ST25' },
            unit: { name: 'Bao 10kg' },
            receivedQuantity: new Prisma.Decimal(30),
            availableQuantity: new Prisma.Decimal(10),
            reservedQuantity: new Prisma.Decimal(20),
            distributedQuantity: new Prisma.Decimal(15),
            lostQuantity: new Prisma.Decimal(0),
          },
        ]),
      },
    } as unknown as PrismaService;

    orgAccess = {
      requireEventOrganizer: vi.fn(),
    } as unknown as OrganizationAccessService;

    service = new DashboardService(prisma, orgAccess);
  });

  it('throws NotFoundException if event does not exist', async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(null);

    await expect(
      service.getOverviewStats(mockAdmin, 'invalid-id'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws ForbiddenException if non-admin is not an organizer of the event', async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockEvent as any);
    vi.mocked(orgAccess.requireEventOrganizer).mockRejectedValue(
      new ForbiddenException('Not organizer'),
    );

    await expect(
      service.getOverviewStats(mockOrganizer, mockEventId),
    ).rejects.toThrow(ForbiddenException);
  });

  it('successfully computes Needed, Pledged, Received, Distributed and Volunteer fulfillment stats', async () => {
    vi.mocked(prisma.event.findUnique).mockResolvedValue(mockEvent as any);

    const result = await service.getOverviewStats(mockAdmin, mockEventId);

    expect(result.eventId).toBe(mockEventId);
    expect(result.eventTitle).toBe('Cứu trợ lũ lụt miền Trung');
    expect(result.organizationName).toBe('Hội Chữ Thập Đỏ');

    // Stats count
    expect(result.stats.donationsCount).toBe(5);
    expect(result.stats.batchesCount).toBe(2);
    expect(result.stats.tripsCount).toBe(1);
    expect(result.stats.applicationsCount).toBe(4);
    expect(result.stats.totalNeededQuantity).toBe(100);
    expect(result.stats.totalReceivedQuantity).toBe(30);
    expect(result.stats.totalDistributedQuantity).toBe(15);
    expect(result.stats.totalVolunteerTarget).toBe(10);
    expect(result.stats.totalVolunteerApproved).toBe(2);

    // Donation need progress
    const needProgress = result.donationNeeds[0];
    expect(needProgress.targetQuantity).toBe(100);
    expect(needProgress.pledgedQuantity).toBe(20);
    expect(needProgress.receivedQuantity).toBe(30);
    expect(needProgress.distributedQuantity).toBe(15);
    expect(needProgress.remainingNeeded).toBe(70);
    expect(needProgress.fulfillmentRate).toBe(30); // 30/100 * 100%
    expect(needProgress.distributionRate).toBe(15); // 15/100 * 100%

    // Volunteer role progress
    const roleProgress = result.volunteerRoles[0];
    expect(roleProgress.targetQuantity).toBe(10);
    expect(roleProgress.approvedCount).toBe(2);
    expect(roleProgress.pendingCount).toBe(1);
    expect(roleProgress.rejectedCount).toBe(1);
    expect(roleProgress.fulfillmentRate).toBe(20); // 2/10 * 100%
  });
});
