import { describe, it, expect, beforeEach, vi } from 'vitest';
import { NotFoundException } from '@nestjs/common';
import { UsersService } from './users.service.js';
import { UsersRepository } from './users.repository.js';
import { OrganizationRole, OrgStatus } from '../../common/enums/index.js';

describe('UsersService (US-03 Profile & Memberships)', () => {
  let service: UsersService;
  let repo: any;

  beforeEach(() => {
    repo = {
      findById: vi.fn(),
      findAll: vi.fn().mockResolvedValue([]),
      update: vi.fn(),
      findMemberships: vi.fn().mockResolvedValue([]),
    };
    service = new UsersService(repo as unknown as UsersRepository);
  });

  it('returns user profile when found', async () => {
    repo.findById.mockResolvedValue({
      id: 'u-1',
      email: 'user@openaid.demo',
      fullName: 'Test User',
    });
    const res = await service.getProfile('u-1');
    expect(res.email).toBe('user@openaid.demo');
  });

  it('throws NotFoundException when profile not found', async () => {
    repo.findById.mockResolvedValue(null);
    await expect(service.getProfile('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('updates user profile after verifying existence', async () => {
    repo.findById.mockResolvedValue({ id: 'u-1' });
    repo.update.mockResolvedValue({ id: 'u-1', fullName: 'Updated Name' });

    const res = await service.updateProfile('u-1', {
      fullName: 'Updated Name',
    });
    expect(res.fullName).toBe('Updated Name');
  });

  it('maps organization memberships accurately', async () => {
    repo.findMemberships.mockResolvedValue([
      {
        organizationId: 'org-1',
        role: OrganizationRole.ORGANIZER,
        organization: {
          name: 'OpenAid',
          code: 'OA-01',
          status: OrgStatus.APPROVED,
        },
      },
    ]);

    const list = await service.getMemberships('u-1');
    expect(list).toEqual([
      {
        organizationId: 'org-1',
        organizationName: 'OpenAid',
        organizationCode: 'OA-01',
        organizationStatus: OrgStatus.APPROVED,
        role: OrganizationRole.ORGANIZER,
      },
    ]);
  });
});
