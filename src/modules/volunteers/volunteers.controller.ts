import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VolunteersService } from './volunteers.service.js';
import { CreateVolunteerDto, ReviewVolunteerDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Volunteers')
@ApiBearerAuth('JWT-auth')
@Controller('volunteers')
export class VolunteersController {
  constructor(private readonly service: VolunteersService) {}

  @Post('apply')
  @ApiOperation({
    summary: 'Nộp đơn ứng tuyển tình nguyện viên vào sự kiện (VOL-01)',
  })
  @ApiResponse({
    status: 201,
    description: 'Nộp đơn thành công, trạng thái khởi tạo là PENDING.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Sự kiện chưa PUBLISHED hoặc vị trí tình nguyện viên đã đủ chỉ tiêu.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy sự kiện hoặc vị trí tình nguyện viên.',
  })
  @ApiResponse({
    status: 409,
    description: 'Người dùng đã nộp đơn vào sự kiện này trước đó.',
  })
  apply(@CurrentUser('id') userId: string, @Body() dto: CreateVolunteerDto) {
    return this.service.registerVolunteer(userId, dto);
  }

  @Get('my')
  @ApiOperation({
    summary:
      'Xem danh sách hoạt động và trạng thái ứng tuyển của bản thân (VOL-02)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Danh sách các đơn ứng tuyển và thông tin điểm danh của người dùng.',
  })
  getMyApplications(@CurrentUser('id') userId: string) {
    return this.service.getMyApplications(userId);
  }

  @Get('event/:eventId')
  @ApiOperation({
    summary:
      'Organizer xem danh sách tình nguyện viên ứng tuyển theo sự kiện (VOL-03)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các đơn ứng tuyển của sự kiện.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền Organizer trên sự kiện.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy sự kiện.',
  })
  getByEvent(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.service.getEventVolunteers(actor, eventId);
  }

  @Patch(':id/review')
  @ApiOperation({
    summary:
      'Organizer xét duyệt (APPROVED/REJECTED) đơn ứng tuyển tình nguyện viên (VOL-04)',
  })
  @ApiResponse({
    status: 200,
    description: 'Xét duyệt thành công, trạng thái đơn được cập nhật.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Vị trí ứng tuyển đã đủ số lượng (capacity), không thể duyệt thêm.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền Organizer trên sự kiện.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn ứng tuyển.',
  })
  review(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewVolunteerDto,
  ) {
    return this.service.reviewApplication(actor, id, dto);
  }

  @Post(':id/check-in')
  @ApiOperation({
    summary: 'Xác nhận Check-in ca trực tình nguyện (VOL-05)',
  })
  @ApiResponse({
    status: 201,
    description:
      'Check-in thành công, lưu lại thời điểm và người thực hiện xác nhận.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Đơn chưa được duyệt APPROVED, sự kiện đã bị hủy hoặc đã check-in trước đó.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Chỉ chính tình nguyện viên hoặc Organizer sự kiện mới có quyền check-in.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn ứng tuyển.',
  })
  checkIn(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.checkIn(actor, id);
  }

  @Post(':id/check-out')
  @ApiOperation({
    summary: 'Xác nhận Check-out ca trực tình nguyện (VOL-06)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Check-out thành công, cập nhật thời điểm và người thực hiện xác nhận.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Đơn chưa được duyệt APPROVED, chưa check-in trước đó hoặc đã check-out rồi.',
  })
  @ApiResponse({
    status: 403,
    description:
      'Chỉ chính tình nguyện viên hoặc Organizer sự kiện mới có quyền check-out.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn ứng tuyển.',
  })
  checkOut(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.checkOut(actor, id);
  }
}
