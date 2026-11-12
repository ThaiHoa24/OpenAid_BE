import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { OrganizationsService } from './organizations.service.js';
import { OrganizationsRepository } from './organizations.repository.js';
import { OrganizationAccessService } from './organization-access.service.js';
import { OrganizationRole, SystemRole } from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('OrganizationsService (US-04 .. US-06)', () => {
  let service: OrganizationsService;
  let repository: any;
  let accessService: any;

  const mockActor: AuthenticatedUser = {
    id: 'user-1',
    email: 'organizer@openaid.demo',
    fullName: 'Organizer',
    systemRole: SystemRole.USER,
  };

  beforeEach(() => {
    repository = {
      findByCode: vi.fn(),
      createWithOrganizer: vi.fn(),
      findMany: vi.fn().mockResolvedValue([]),
      findById: vi.fn(),
      update: vi.fn(),
      findUserByEmail: vi.fn(),
      findMember: vi.fn(),
      addMember: vi.fn(),
    };
    accessService = {
      requireOrganizer: vi.fn().mockResolvedValue(undefined),
    };
    service = new OrganizationsService(
      repository as unknown as OrganizationsRepository,
      accessService as unknown as OrganizationAccessService,
    );
  });

  it('creates an organization when code is unique', async () => {
    repository.findByCode.mockResolvedValue(null);
    repository.createWithOrganizer.mockResolvedValue({
      id: 'org-1',
      code: 'OPENAID-01',
    });

    const res = await service.createOrganization(mockActor, {
      code: 'openaid-01',
      name: 'OpenAid Relief',
      email: 'contact@openaid.demo',
    });

    expect(res.code).toBe('OPENAID-01');
    expect(repository.createWithOrganizer).toHaveBeenCalled();
  });

  it('throws ConflictException when organization code already exists', async () => {
    repository.findByCode.mockResolvedValue({ id: 'org-existing' });
    await expect(
      service.createOrganization(mockActor, {
        code: 'DUP-01',
        name: 'Dup Org',
        email: 'dup@openaid.demo',
      }),
    ).rejects.toThrow(ConflictException);
  });

  it('throws NotFoundException when organization does not exist', async () => {
    repository.findById.mockResolvedValue(null);
    await expect(service.getOrganizationById('missing')).rejects.toThrow(
      NotFoundException,
    );
  });

  it('adds member by email and checks for duplicate membership', async () => {
    repository.findUserByEmail.mockResolvedValue({ id: 'user-2' });
    repository.findMember.mockResolvedValue(null);
    repository.addMember.mockResolvedValue({
      organizationId: 'org-1',
      userId: 'user-2',
      role: OrganizationRole.MEMBER,
    });

    const res = await service.addMember(mockActor, 'org-1', {
      email: 'member@openaid.demo',
      role: OrganizationRole.MEMBER,
    });

    expect(res.userId).toBe('user-2');
  });

  it('throws BadRequestException if neither userId nor email is provided', async () => {
    await expect(
      service.addMember(mockActor, 'org-1', {
        role: OrganizationRole.MEMBER,
      }),
    ).rejects.toThrow(BadRequestException);
  });
});
