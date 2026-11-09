import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EvidenceService } from './evidence.service.js';
import { CreateEvidenceDto, ReviewEvidenceDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Evidence')
@ApiBearerAuth('JWT-auth')
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly service: EvidenceService) {}

  @Post()
  @ApiOperation({
    summary:
      'OA-S5-08: Tải lên bằng chứng phân phối (ảnh, xác nhận quyền riêng tư)',
  })
  @ApiResponse({
    status: 201,
    description: 'Bằng chứng được tải lên thành công, chờ Organizer duyệt',
  })
  @ApiResponse({
    status: 400,
    description: 'Điểm phân phối hoặc biên bản không thuộc chuyến xe',
  })
  @ApiResponse({
    status: 403,
    description:
      'Chỉ Organizer hoặc Tình nguyện viên tham gia chuyến xe mới có quyền tải lên bằng chứng',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy chuyến xe' })
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateEvidenceDto,
  ) {
    return this.service.createEvidence(actor, dto);
  }

  @Get('trip/:tripId')
  @ApiOperation({
    summary: 'Lấy danh sách bằng chứng phân phối của một chuyến xe',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách bằng chứng của chuyến xe',
  })
  @ApiResponse({
    status: 403,
    description:
      'Chỉ Organizer hoặc Tình nguyện viên tham gia chuyến xe mới có quyền xem bằng chứng nội bộ',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy chuyến xe' })
  getByTrip(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('tripId') tripId: string,
  ) {
    return this.service.getEvidenceByTrip(actor, tripId);
  }

  @Patch(':id/review')
  @ApiOperation({
    summary: 'OA-S5-08: Organizer duyệt hoặc từ chối bằng chứng phân phối',
  })
  @ApiResponse({
    status: 200,
    description: 'Trạng thái bằng chứng được cập nhật và ghi log minh bạch',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ Organizer của sự kiện hoặc Admin mới có quyền duyệt',
  })
  @ApiResponse({ status: 404, description: 'Không tìm thấy bằng chứng' })
  review(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewEvidenceDto,
  ) {
    return this.service.reviewEvidence(actor, id, dto);
  }
}
