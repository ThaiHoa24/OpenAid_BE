import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { InventoryService } from './inventory.service.js';
import { InventoryQueryDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Inventory')
@ApiBearerAuth('JWT-auth')
@Controller('inventory')
export class InventoryController {
  constructor(private readonly service: InventoryService) {}

  @Get('organization/:organizationId')
  @ApiOperation({
    summary:
      'OA-S4-05: Truy vấn tồn kho Available/Reserved/Distributed/Lost theo tổ chức/sự kiện',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách tồn kho theo loại hàng hóa và đơn vị tính',
  })
  @ApiResponse({
    status: 403,
    description:
      'Chỉ Organizer của tổ chức hoặc Admin mới có quyền truy cập thông tin tồn kho',
  })
  getByOrganization(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('organizationId') organizationId: string,
    @Query() query: InventoryQueryDto,
  ) {
    return this.service.getOrganizationInventory(actor, organizationId, query);
  }
}
