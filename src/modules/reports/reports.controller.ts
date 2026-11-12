import { Controller, Get, Param, Query, Res } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiProduces,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ReportsService } from './reports.service.js';
import { CurrentUser } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { ExportReportQueryDto } from './dto/index.js';

@ApiTags('Reports')
@ApiBearerAuth('JWT-auth')
@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('events/:id/export')
  @ApiOperation({
    summary: 'REP-01: Xuất báo cáo tổng kết nghiệm thu (PDF / CSV / Excel)',
    description:
      'Tổng hợp toàn bộ dữ liệu tiếp nhận (donations), tồn kho (inventory/batches) và phân phối (trips/distribution) của chiến dịch và trả về tệp tài liệu với header tải file chuẩn.',
  })
  @ApiProduces(
    'application/pdf',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
  )
  @ApiResponse({
    status: 200,
    description: 'Tệp báo cáo tổng kết nghiệm thu tải về thành công',
  })
  @ApiResponse({
    status: 400,
    description: 'Định dạng xuất báo cáo không hợp lệ',
  })
  @ApiResponse({
    status: 403,
    description: 'Không có quyền truy cập báo cáo của chiến dịch này',
  })
  @ApiResponse({
    status: 404,
    description: 'Không tìm thấy chiến dịch cứu trợ',
  })
  async exportEventReport(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Query() query: ExportReportQueryDto,
    @Res() res: Response,
  ) {
    const { buffer, mimeType, fileName } =
      await this.reportsService.exportEventReport(actor, id, query.format);

    res.setHeader('Content-Type', mimeType);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${fileName}"`,
    );
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  }
}

