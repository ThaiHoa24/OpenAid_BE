import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
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

  @Get('events/:eventId/export')
  @ApiOperation({
    summary:
      'REP-01 (Alias): Xuất báo cáo tổng kết nghiệm thu sự kiện (CSV / Excel / PDF / JSON)',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'excel', 'pdf', 'json'],
  })
  @ApiResponse({ status: 200, description: 'Báo cáo tổng kết nghiệm thu' })
  exportFromDashboard(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Query('format') format?: string,
  ) {
    return this.service.exportEventReport(actor, eventId, format);
  }
}

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: DashboardService) {}

  @Get('events/:id/export')
  @ApiOperation({
    summary:
      'REP-01: Xuất báo cáo tổng kết nghiệm thu chiến dịch (PDF / CSV / Excel): Tổng hợp tiếp nhận - tồn kho - phân phối',
  })
  @ApiQuery({
    name: 'format',
    required: false,
    enum: ['csv', 'excel', 'pdf', 'json'],
    description: 'Định dạng xuất báo cáo (mặc định: csv)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Dữ liệu báo cáo nghiệm thu kèm nội dung file (content, fileName, mimeType)',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ Organizer của sự kiện hoặc Admin mới có quyền xuất báo cáo',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sự kiện' })
  exportEventReport(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Query('format') format?: string,
  ) {
    return this.service.exportEventReport(actor, id, format);
  }
}
