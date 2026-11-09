import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { CurrentUser } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('events/:eventId')
  @ApiOperation({
    summary:
      'OA-S4-04 / OA-S5-05: Lấy thống kê tổng quan sự kiện (Donations, Batches, Trips, Volunteers, Inventory)',
  })
  @ApiResponse({
    status: 200,
    description: 'Dữ liệu tổng quan dashboard của sự kiện',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ Organizer của sự kiện hoặc Admin mới có quyền xem',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sự kiện' })
  overview(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.service.getOverviewStats(actor, eventId);
  }
}
