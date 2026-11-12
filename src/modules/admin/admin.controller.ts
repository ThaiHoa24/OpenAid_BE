import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { CurrentUser, Roles } from '../../common/decorators/index.js';
import { SystemRole } from '../../common/enums/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import {
  AdminEventQueryDto,
  ModerateEventStatusDto,
  ReviewOrganizationDto,
  SetUserActiveDto,
} from './dto/index.js';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@Roles(SystemRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('organizations/pending')
  @ApiOperation({
    summary:
      'ADM-01: Admin xem danh sách các tổ chức cứu trợ đang chờ duyệt (PENDING)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các tổ chức chờ duyệt kèm phân trang',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ System Admin mới có quyền truy cập',
  })
  pendingOrganizations(@Query() query: PaginationDto) {
    return this.service.getPendingOrganizations(query);
  }

  @Patch('organizations/:id/review')
  @ApiOperation({
    summary:
      'ADM-02: Admin phê duyệt (APPROVED) hoặc từ chối (REJECTED) tổ chức cứu trợ',
  })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái tổ chức được cập nhật và ghi log kiểm toán',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ System Admin mới có quyền truy cập',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tổ chức' })
  reviewOrganization(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewOrganizationDto,
  ) {
    return this.service.reviewOrganization(actor, id, dto);
  }

  @Get('users')
  @ApiOperation({
    summary:
      'ADM-03: Admin xem danh sách toàn bộ người dùng trong hệ thống kèm phân trang',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách người dùng và trạng thái tài khoản',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ System Admin mới có quyền truy cập',
  })
  users(@Query() query: PaginationDto) {
    return this.service.getAllUsers(query);
  }

  @Patch('users/:id/active')
  @ApiOperation({
    summary:
      'ADM-04: Admin kích hoạt hoặc vô hiệu hóa / khóa tài khoản người dùng',
  })
  @ApiResponse({
    status: 200,
    description:
      'Trạng thái hoạt động của tài khoản người dùng đã được cập nhật',
  })
  @ApiResponse({
    status: 400,
    description: 'Admin không được phép tự khóa tài khoản của chính mình',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ System Admin mới có quyền truy cập',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy người dùng' })
  setUserActive(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetUserActiveDto,
  ) {
    return this.service.toggleUserActive(actor, id, dto);
  }

  @Get('events')
  @ApiOperation({
    summary:
      'ADM-05: Admin xem, tìm kiếm và lọc danh sách tất cả sự kiện (theo tổ chức, trạng thái) kèm phân trang',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách toàn bộ sự kiện kèm thông tin tổ chức và người tạo',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ System Admin mới có quyền truy cập',
  })
  events(@Query() query: AdminEventQueryDto) {
    return this.service.getAllEvents(query);
  }

  @Patch('events/:id/status')
  @ApiOperation({
    summary:
      'ADM-06: Kiểm duyệt sự kiện cấp hệ thống (Admin đình chỉ SUSPENDED/CLOSED, mở lại PUBLISHED, hoặc cưỡng chế CANCELLED)',
  })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái sự kiện đã được cập nhật và ghi nhận vào nhật ký kiểm toán',
  })
  @ApiResponse({
    status: 400,
    description: 'Trạng thái chuyển đổi không hợp lệ',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ System Admin mới có quyền truy cập hoặc tổ chức chưa được duyệt',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy sự kiện' })
  moderateEventStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ModerateEventStatusDto,
  ) {
    return this.service.moderateEventStatus(actor, id, dto);
  }
}
