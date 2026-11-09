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
import { DonationsService } from './donations.service.js';
import { CreateDonationDto, ReceiveDonationDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Donations')
@ApiBearerAuth('JWT-auth')
@Controller('donations')
export class DonationsController {
  constructor(private readonly service: DonationsService) {}

  @Post()
  @ApiOperation({
    summary: 'Đăng ký quyên góp hiện vật và nhận Tracking ID (DON-01)',
  })
  @ApiResponse({
    status: 201,
    description:
      'Đăng ký thành công, sinh mã Tracking ID duy nhất, trạng thái khởi tạo là PENDING.',
  })
  @ApiResponse({
    status: 400,
    description: 'Sự kiện chưa PUBLISHED hoặc dữ liệu gửi lên không hợp lệ.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy nhu cầu quyên góp (DonationNeed).',
  })
  create(@CurrentUser('id') donorId: string, @Body() dto: CreateDonationDto) {
    return this.service.createDonation(donorId, dto);
  }

  @Get('my')
  @ApiOperation({
    summary: 'Xem danh sách các khoản quyên góp của bản thân (DON-02)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Danh sách các khoản quyên góp của Donor kèm trạng thái và Tracking ID.',
  })
  getMyDonations(
    @CurrentUser('id') donorId: string,
    @Query() query: PaginationDto,
  ) {
    return this.service.getMyDonations(donorId, query);
  }

  @Get('event/:eventId')
  @ApiOperation({
    summary:
      'Organizer xem danh sách các khoản quyên góp theo sự kiện (DON-03)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các khoản quyên góp của sự kiện.',
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
    @Query() query: PaginationDto,
  ) {
    return this.service.getEventDonations(actor, eventId, query);
  }

  @Patch(':id/receipt')
  @ApiOperation({
    summary: 'Organizer xác nhận tiếp nhận hoặc từ chối hiện vật (DON-04)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Xử lý thành công. Nếu RECEIVED: tồn kho Available tự động tăng; nếu REJECTED: lưu lý do từ chối và kho giữ nguyên.',
  })
  @ApiResponse({
    status: 400,
    description: 'Đơn quyên góp không ở trạng thái PENDING.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền Organizer trên sự kiện.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn quyên góp.',
  })
  receive(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReceiveDonationDto,
  ) {
    return this.service.receiveDonation(actor, id, dto);
  }

  @Post(':id/cancel')
  @ApiOperation({
    summary: 'Donor hủy khoản quyên góp đang ở trạng thái PENDING (DON-05)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Hủy đơn quyên góp thành công, trạng thái chuyển sang CANCELLED.',
  })
  @ApiResponse({
    status: 400,
    description: 'Đơn quyên góp không ở trạng thái PENDING.',
  })
  @ApiResponse({
    status: 403,
    description: 'Chỉ chính chủ sở hữu (Donor) mới có quyền hủy đơn.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy đơn quyên góp.',
  })
  cancel(@CurrentUser('id') donorId: string, @Param('id') id: string) {
    return this.service.cancelDonation(donorId, id);
  }
}
