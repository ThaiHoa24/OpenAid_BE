import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { InventoryService } from './inventory.service.js';
import { InventoryQueryDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Inventory')
@ApiBearerAuth('JWT-auth')
@ApiResponse({
  status: 501,
  description:
    'Scaffold: Inventory queries are pending. Stock writes belong to workflow transactions.',
})
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('organization/:organizationId')
  getByOrganization(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Query() query: InventoryQueryDto,
  ) {
    return this.service.getOrganizationInventory(actor, organizationId, query);
  }
}
