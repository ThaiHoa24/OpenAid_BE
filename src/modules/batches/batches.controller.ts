import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { BatchesService } from './batches.service.js';
import {
  CreateBatchDto,
  ReconcileBatchDto,
  UpdateBatchDto,
} from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Batches')
@ApiBearerAuth('JWT-auth')
@Controller('batches')
export class BatchesController {
  constructor(private readonly service: BatchesService) {}

  @Post()
  @ApiOperation({
    summary: 'Tạo Lô hàng (Batch) từ các khoản quyên góp đã tiếp nhận (BAT-01)',
  })
  @ApiResponse({
    status: 201,
    description:
      'Tạo lô hàng thành công, tự động chuyển tồn kho Available sang Reserved.',
  })
  @ApiResponse({
    status: 400,
    description:
      'Quyên góp không cùng Event/loại hàng/đơn vị, hoặc tồn kho khả dụng không đủ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền Organizer trên sự kiện.',
  })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateBatchDto) {
    return this.service.createBatch(actor, dto);
  }

  @Get('event/:eventId')
  @ApiOperation({
    summary: 'Organizer xem danh sách các Lô hàng theo sự kiện (BAT-02)',
  })
  @ApiResponse({
    status: 200,
    description: 'Danh sách các lô hàng của sự kiện.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền Organizer trên sự kiện.',
  })
  getByEvent(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.service.getBatchesByEvent(actor, eventId);
  }

  @Get(':id')
  @ApiOperation({
    summary: 'Xem chi tiết một Lô hàng (BAT-03)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Thông tin chi tiết lô hàng kèm danh sách quyên góp thành phần.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền Organizer trên sự kiện.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy lô hàng.',
  })
  getById(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getBatchById(actor, id);
  }

  @Patch(':id/status')
  @ApiOperation({
    summary:
      'Cập nhật trạng thái Lô hàng (chuyển sang READY để gán chuyến xe) (BAT-04)',
  })
  @ApiResponse({
    status: 200,
    description: 'Cập nhật trạng thái lô hàng thành công.',
  })
  @ApiResponse({
    status: 400,
    description: 'Chuyển đổi trạng thái không hợp lệ.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền Organizer trên sự kiện.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy lô hàng.',
  })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.service.updateBatch(actor, id, dto);
  }

  @Post(':id/reconcile')
  @ApiOperation({
    summary:
      'Đối soát kết quả lô hàng sau chuyến đi: ghi nhận hàng trả về và hàng thất thoát (BAT-05)',
  })
  @ApiResponse({
    status: 200,
    description:
      'Đối soát thành công, hàng trả về chuyển về Available, hàng thất thoát được ghi nhận Lost.',
  })
  @ApiResponse({
    status: 400,
    description: 'Tổng hàng trả về và thất thoát vượt quá số lượng ban đầu.',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền Organizer trên sự kiện.',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy lô hàng.',
  })
  reconcile(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReconcileBatchDto,
  ) {
    return this.service.reconcileBatch(actor, id, dto);
  }
}
