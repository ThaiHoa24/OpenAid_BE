import {
  IsBoolean,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus, OrgStatus } from '../../../common/enums/index.js';

export class ReviewOrganizationDto {
  @ApiProperty({ enum: OrgStatus })
  @IsEnum(OrgStatus)
  status!: OrgStatus;
}

export class SetUserActiveDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}

export class AdminEventQueryDto {
  @ApiPropertyOptional({
    default: 1,
    minimum: 1,
    description: 'Số trang (1-indexed)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Số lượng bản ghi mỗi trang',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number;

  @ApiPropertyOptional({
    default: 0,
    minimum: 0,
    description: 'Số bản ghi bỏ qua (hỗ trợ tương thích skip/take)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({
    default: 20,
    minimum: 1,
    maximum: 100,
    description: 'Số lượng lấy (hỗ trợ tương thích skip/take)',
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  take?: number;

  @ApiPropertyOptional({
    description:
      'Từ khóa tìm kiếm (theo tên chiến dịch, mô tả, địa điểm, người liên hệ, hoặc tên tổ chức)',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Lọc theo ID tổ chức cứu trợ',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    enum: EventStatus,
    description:
      'Lọc theo trạng thái chiến dịch: DRAFT, PUBLISHED, COMPLETED, CLOSED, CANCELLED, SUSPENDED',
  })
  @IsOptional()
  @IsEnum(EventStatus)
  status?: EventStatus;
}

export class AdminModerateEventDto {
  @ApiProperty({
    enum: [EventStatus.SUSPENDED, EventStatus.CANCELLED],
    description:
      'Trạng thái kiểm duyệt: SUSPENDED (đình chỉ) hoặc CANCELLED (cưỡng chế hủy)',
    example: EventStatus.SUSPENDED,
  })
  @IsEnum(EventStatus)
  status!: EventStatus;

  @ApiPropertyOptional({
    description:
      'Lý do kiểm duyệt / vi phạm quy chuẩn / gian lận để lưu audit log',
    example:
      'Tổ chức có dấu hiệu gian lận hàng cứu trợ, tạm đình chỉ để kiểm toán',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
