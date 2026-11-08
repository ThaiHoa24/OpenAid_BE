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
import { Public } from '../../common/decorators/index.js';

export interface UploadedMultipartFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

@ApiTags('Storage')
@Controller('uploads')
export class StorageController {
  constructor(private readonly storageService: StorageService) {}

  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({
    summary: 'Upload a shared file (JPEG, PNG, WebP, max 5MB)',
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
  @ApiResponse({ status: 201, description: 'File uploaded successfully' })
  @ApiResponse({
    status: 400,
    description: 'Invalid file format or file size exceeds 5MB',
  })
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file?: UploadedMultipartFile) {
    if (!file) {
      throw new BadRequestException(
        'No file provided in form-data field "file"',
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
  @ApiOperation({ summary: 'Stream / view an uploaded file by key' })
  @ApiResponse({ status: 200, description: 'File stream content' })
  @ApiResponse({ status: 404, description: 'File not found' })
  async serveFile(@Param('key') key: string, @Res() res: Response) {
    const { buffer, mimeType } = await this.storageService.getFile(key);
    res.setHeader('Content-Type', mimeType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  }
}
