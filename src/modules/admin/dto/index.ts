import {
  IsBoolean,
  IsEnum,
  IsIn,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EventStatus, OrgStatus } from '../../../common/enums/index.js';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';

export const ADMIN_EVENT_STATUS_VALUES = [
  EventStatus.DRAFT,
  EventStatus.PUBLISHED,
  EventStatus.CLOSED,
  EventStatus.CANCELLED,
  'COMPLETED',
  'SUSPENDED',
] as const;

export type AdminEventStatusFilter = (typeof ADMIN_EVENT_STATUS_VALUES)[number];

export class ReviewOrganizationDto {
  @ApiProperty({ enum: OrgStatus })
  @IsEnum(OrgStatus)
  status!: OrgStatus;

  @ApiPropertyOptional({ description: 'Lý do từ chối hoặc ghi chú phê duyệt' })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}

export class SetUserActiveDto {
  @ApiProperty()
  @IsBoolean()
  isActive!: boolean;
}

export class AdminEventQueryDto extends PaginationDto {
  @ApiPropertyOptional({
    description: 'Từ khóa tìm kiếm theo tiêu đề, mô tả, địa điểm hoặc tên tổ chức',
  })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Lọc sự kiện theo ID tổ chức cứu trợ',
  })
  @IsOptional()
  @IsUUID()
  organizationId?: string;

  @ApiPropertyOptional({
    enum: ADMIN_EVENT_STATUS_VALUES,
    description:
      'Lọc theo trạng thái sự kiện (hỗ trợ DRAFT, PUBLISHED, CLOSED/COMPLETED, CANCELLED, SUSPENDED)',
  })
  @IsOptional()
  @IsIn(ADMIN_EVENT_STATUS_VALUES)
  status?: AdminEventStatusFilter;
}

export class ModerateEventStatusDto {
  @ApiProperty({
    enum: ADMIN_EVENT_STATUS_VALUES,
    description:
      'ADM-06: Trạng thái kiểm duyệt mục tiêu (PUBLISHED, CLOSED, CANCELLED, SUSPENDED, COMPLETED, DRAFT)',
  })
  @IsIn(ADMIN_EVENT_STATUS_VALUES)
  status!: AdminEventStatusFilter;

  @ApiPropertyOptional({
    description: 'Lý do đình chỉ / hủy / kiểm duyệt sự kiện của Admin',
  })
  @IsOptional()
  @IsString()
  reason?: string;
}
