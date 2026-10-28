import { Injectable } from '@nestjs/common';
import { InventoryRepository } from './inventory.repository.js';
import { InventoryQueryDto } from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';

@Injectable()
export class InventoryService {
  constructor(private readonly repository: InventoryRepository) {}

  async getOrganizationInventory(
    _actor: AuthenticatedUser,
    _organizationId: string,
    _query: InventoryQueryDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR03/FR15: Event-earmarked stock, scoped to Organization',
    );
  }
}
