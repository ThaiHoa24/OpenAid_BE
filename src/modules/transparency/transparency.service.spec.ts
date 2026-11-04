import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TransparencyService } from './transparency.service.js';
import { TransparencyRepository } from './transparency.repository.js';
import { SystemRole, TransparencyEntityType } from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('TransparencyService (KAN-18 Shared Log Foundation)', () => {
  let service: TransparencyService;
  let repository: TransparencyRepository;

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

    service = new TransparencyService(repository);
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

      vi.spyOn(repository, 'findRecentLogs').mockResolvedValue(sampleLogs as any);
      vi.spyOn(repository, 'countLogs').mockResolvedValue(1);

      const result = await service.getRecentAuditLogs({ skip: 0, take: 10 });

      expect(result.items).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.skip).toBe(0);
      expect(result.take).toBe(10);
      expect(repository.findRecentLogs).toHaveBeenCalledWith({ skip: 0, take: 10 });
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
});
