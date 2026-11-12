import { describe, it, expect, beforeEach, vi } from 'vitest';
import { InventoryService } from './inventory.service.js';
import { InventoryRepository } from './inventory.repository.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import { SystemRole } from '../../common/enums/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

describe('InventoryService (US-17 Warehouse Inventory)', () => {
  let service: InventoryService;
  let repository: any;
  let accessService: any;

  const mockOrganizer: AuthenticatedUser = {
    id: 'org-user-1',
    email: 'organizer@openaid.demo',
    fullName: 'Organizer',
    systemRole: SystemRole.USER,
  };

  const mockAdmin: AuthenticatedUser = {
    id: 'admin-1',
    email: 'admin@openaid.demo',
    fullName: 'Admin',
    systemRole: SystemRole.ADMIN,
  };

  beforeEach(() => {
    repository = {
      findByOrganization: vi.fn().mockResolvedValue([{ id: 'inv-1' }]),
    };
    accessService = {
      requireOrganizer: vi.fn().mockResolvedValue(undefined),
    };
    service = new InventoryService(
      repository as unknown as InventoryRepository,
      accessService as unknown as OrganizationAccessService,
    );
  });

  it('verifies organizer access for regular users before querying inventory', async () => {
    const res = await service.getOrganizationInventory(
      mockOrganizer,
      'org-1',
      { eventId: 'ev-1' },
    );
    expect(accessService.requireOrganizer).toHaveBeenCalledWith(
      mockOrganizer.id,
      'org-1',
    );
    expect(repository.findByOrganization).toHaveBeenCalledWith('org-1', 'ev-1');
    expect(res).toHaveLength(1);
  });

  it('bypasses organizer check for SystemRole.ADMIN', async () => {
    await service.getOrganizationInventory(mockAdmin, 'org-1', {});
    expect(accessService.requireOrganizer).not.toHaveBeenCalled();
    expect(repository.findByOrganization).toHaveBeenCalledWith(
      'org-1',
      undefined,
    );
  });
});
