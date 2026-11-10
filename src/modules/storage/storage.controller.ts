import {
  BadRequestException,
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiBody,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { StorageService } from './storage.service.js';
import { Public, Roles } from '../../common/decorators/index.js';
import { SystemRole } from '../../common/enums/index.js';
import { PrismaService } from '../../database/prisma.service.js';

export interface UploadedMultipartFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@ApiTags('Storage')
@Controller('uploads')
export class StorageController {
  constructor(
    private readonly storageService: StorageService,
    private readonly prisma: PrismaService,
  ) {}

  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({
    summary:
      'Tải lên tệp đa phương tiện (JPEG, PNG, WebP, dung lượng tối đa 5MB)',
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
        },
      },
    },
  })
  @ApiResponse({ status: 201, description: 'Tải lên tệp thành công' })
  @ApiResponse({
    status: 400,
    description: 'Định dạng tệp không hợp lệ hoặc kích thước vượt quá 5MB',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file?: UploadedMultipartFile) {
    if (!file) {
      throw new BadRequestException(
        'Vui lòng đính kèm tệp tin qua form-data với trường "file"',
      );
    }

    return this.storageService.save({
      bytes: file.buffer,
      mimeType: file.mimetype,
      originalName: file.originalname,
    });
  }

  @Public()
  @Get(':key')
  @ApiOperation({ summary: 'Truy xuất / hiển thị tệp tin lưu trữ theo key' })
  @ApiResponse({ status: 200, description: 'Nội dung tệp nhị phân' })
  @ApiResponse({ status: 404, description: 'Không tìm thấy tệp' })
  async serveFile(@Param('key') key: string, @Res() res: Response) {
    const { buffer, mimeType } = await this.storageService.getFile(key);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(SystemRole.ADMIN)
  @Post('cleanup')
  @ApiOperation({
    summary:
      'Admin kích hoạt dọn dẹp các tệp tin mồ côi (không gắn với Evidence/User/Donation)',
  })
  @ApiResponse({
    status: 200,
    description: 'Báo cáo số lượng tệp đã quét và số lượng tệp rác đã xóa',
  })
  async cleanupOrphans() {
    return this.storageService.cleanupOrphans(this.prisma);
  }
}
