import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { DistributionService } from './distribution.service.js';
import {
  CreateDistributionDto,
  UpdateDistributionPointDto,
} from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Distribution')
@ApiBearerAuth('JWT-auth')
@Controller('distribution')
export class DistributionController {
  constructor(private readonly service: DistributionService) {}

  @Post('records')
  @ApiOperation({
    summary: 'Ghi nhận số lượng hiện vật thực tế phát tại điểm (DIS-01)',
  })
  @ApiResponse({
    status: 201,
    description:
      'Ghi nhận thành công, tự động cập nhật điểm phát sang DISTRIBUTED.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Lô hàng và điểm phát không cùng chuyến xe, hoặc số lượng phát vượt quá tổng lô hàng.',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ Trip Leader hoặc Organizer mới có quyền ghi nhận.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy lô hàng trong chuyến hoặc điểm phát.',
  })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateDistributionDto,
  ) {
    return this.service.createDistribution(actor, dto);
  }

  @Get('records/:id')
  @ApiOperation({
    summary: 'Xem chi tiết một biên bản cấp phát thực tế (DIS-02)',
  })
  @ApiResponse({
    status: 200,
    description: 'Thông tin chi tiết biên bản cấp phát.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy biên bản cấp phát.',
  })
  getById(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getDistributionById(actor, id);
  }

  @Get('trip/:tripId')
  @ApiOperation({
    summary: 'Xem toàn bộ biên bản cấp phát của một chuyến xe (DIS-03)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các biên bản cấp phát của chuyến xe.',
  })
  getByTrip(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('tripId') tripId: string,
  ) {
    return this.service.getDistributionsByTrip(actor, tripId);
  }

  @Patch('points/:id/status')
  @ApiOperation({
    summary:
      'Cập nhật trạng thái Điểm phát (PENDING -> ARRIVED -> DISTRIBUTED / SKIPPED) (DIS-04)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái điểm phát thành công.',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ Trip Leader hoặc Organizer mới có quyền cập nhật.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy điểm phát.',
  })
  updatePoint(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDistributionPointDto,
  ) {
    return this.service.updatePoint(actor, id, dto);
  }
}
