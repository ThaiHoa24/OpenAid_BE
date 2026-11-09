import { Controller, Get, Param, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TransparencyService } from './transparency.service.js';
import { CurrentUser, Public, Roles } from '../../common/decorators/index.js';
import { SystemRole } from '../../common/enums/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { TimelineQueryDto } from './dto/index.js';

@ApiTags('Transparency')
@Controller('transparency')
export class TransparencyController {
  constructor(private readonly service: TransparencyService) {}

  @Public()
  @Get('track/:trackingId')
  @ApiOperation({
    summary:
      'OA-S5-04: Tra cứu hành trình minh bạch của gói cứu trợ theo Tracking ID (công khai, không lộ thông tin cá nhân)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Hành trình đóng góp gồm thông tin đợt quyên góp, lô hàng, chuyến xe, các điểm phát và bằng chứng đã duyệt',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy mã vận đơn cứu trợ',
  })
  track(@Param('trackingId') trackingId: string) {
    return this.service.searchByTrackingId(trackingId);
  }

  @ApiBearerAuth('JWT-auth')
  @Get('timeline')
  @ApiOperation({
    summary: 'OA-S5-08: Lấy dòng thời gian minh bạch (timeline) theo thực thể',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách log minh bạch theo thứ tự thời gian',
  })
  timeline(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: TimelineQueryDto,
  ) {
    return this.service.getTimeline(actor, query);
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(SystemRole.ADMIN)
  @Get('logs')
  @ApiOperation({
    summary:
      'Truy vấn toàn bộ nhật ký kiểm toán hệ thống (Audit Logs) dành riêng cho Quản trị viên',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách nhật ký kiểm toán kèm phân trang',
  })
  @ApiResponse({ status: 403, description: 'Chỉ Admin mới có quyền truy cập' })
  logs(@Query() query: PaginationDto) {
    return this.service.getRecentAuditLogs(query);
  }
}
