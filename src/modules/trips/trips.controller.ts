import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { TripsService } from './trips.service.js';
import { CreateTripDto, UpdateTripDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Trips')
@ApiBearerAuth('JWT-auth')
@Controller('trips')
export class TripsController {
  constructor(private readonly service: TripsService) {}

  @Get('event/:eventId')
  @ApiOperation({
    summary: 'Organizer xem danh sách chuyến xe cứu trợ theo sự kiện (TRP-01)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các chuyến xe cứu trợ của sự kiện.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền Organizer trên sự kiện.',
  })
  getByEvent(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Query() query: PaginationDto,
  ) {
    return this.service.getTripsByEvent(actor, eventId, query);
  }

  @Get(':id')
  @ApiOperation({
    summary:
      'Xem chi tiết chuyến xe cứu trợ, danh sách lô hàng, điểm phát và nhân sự (TRP-02)',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin chi tiết chuyến xe cứu trợ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập chuyến xe.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy chuyến xe.',
  })
  getById(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getTripById(actor, id);
  }

  @Post()
  @ApiOperation({
    summary:
      'Lập chuyến xe cứu trợ mới: gán lô hàng READY, TNV APPROVED (1 Leader), các Điểm phát (TRP-03)',
  })
  @ApiResponse({
    status: 201,
    description: 'Lập chuyến xe thành công, lô hàng chuyển sang ASSIGNED.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Lô hàng không ở trạng thái READY, thiếu hoặc thừa Trip Leader, hoặc TNV chưa APPROVED.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền Organizer trên sự kiện.',
  })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateTripDto) {
    return this.service.createTrip(actor, dto);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Cập nhật trạng thái chuyến xe (SCHEDULED -> PREPARING -> IN_TRANSIT -> COMPLETED / CANCELLED) (TRP-04)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái chuyến xe thành công.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Không thể hoàn tất nếu còn điểm chưa hoàn thành, hoặc không thể hủy nếu đã phát hàng.',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ Organizer hoặc Trip Leader mới có quyền cập nhật.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy chuyến xe.',
  })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.service.updateTrip(actor, id, dto);
  }
}
