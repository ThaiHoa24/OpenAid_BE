import { Injectable } from '@nestjs/common';
import { SystemRole } from '@prisma/client';
import { InventoryRepository } from './inventory.repository.js';
import { InventoryQueryDto } from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';

@Injectable()
export class InventoryService {
  constructor(
    private readonly repository: InventoryRepository,
    private readonly organizationAccessService: OrganizationAccessService,
  ) {}

  async getOrganizationInventory(
    actor: AuthenticatedUser,
    organizationId: string,
    query: InventoryQueryDto,
  ) {
    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireOrganizer(
        actor.id,
        organizationId,
      );
    }

    return this.repository.findByOrganization(organizationId, query.eventId);
  }
}
