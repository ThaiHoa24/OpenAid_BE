import { Type } from 'class-transformer';
import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  ValidateNested,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TripStatus, TripVolunteerRole } from '../../../common/enums/index.js';

export class TripVolunteerInputDto {
  @ApiProperty({
    format: 'uuid',
    description: 'Must be an APPROVED application for this Event.',
  })
  @IsUUID()
  applicationId!: string;

  @ApiProperty({ enum: TripVolunteerRole })
  @IsEnum(TripVolunteerRole)
  role!: TripVolunteerRole;
}

export class DistributionPointInputDto {
  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  position!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  mapUrl?: string;
}

export class CreateTripDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  eventId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  departurePoint!: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  departureDate!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  vehicle?: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  batchIds!: string[];

  @ApiProperty({ type: [TripVolunteerInputDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => TripVolunteerInputDto)
  volunteers!: TripVolunteerInputDto[];

  @ApiProperty({ type: [DistributionPointInputDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => DistributionPointInputDto)
  points!: DistributionPointInputDto[];
}

export class UpdateTripDto {
  @ApiProperty({
    enum: TripStatus,
    description:
      'Transition rules and completion/cancellation checks belong to the use case.',
  })
  @IsEnum(TripStatus)
  status!: TripStatus;
}

/**
 * Atomic distribution record + evidence upload for a trip point
 * Combines DIS-01 (create distribution record) + Evidence upload in one transaction
 */
export class RecordDistributionWithEvidenceDto {
  @ApiProperty({ format: 'uuid', description: 'TripBatch ID (from trip.batches[].id)' })
  @IsUUID()
  tripBatchId!: string;

  @ApiProperty({ format: 'uuid', description: 'Distribution Point ID' })
  @IsUUID()
  distributionPointId!: string;

  @ApiProperty({ minimum: 0.001, description: 'Số lượng phát thực tế' })
  @IsString()
  @IsNotEmpty()
  distributedQuantity!: string;

  @ApiPropertyOptional({ description: 'Số hộ dân nhận quà' })
  @IsOptional()
  @IsInt()
  @Min(0)
  beneficiaryCount?: number;

  @ApiPropertyOptional({ description: 'Ghi chú biên bản cấp phát' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiProperty({ description: 'URL ảnh minh chứng (bắt buộc)' })
  @IsUrl()
  @IsNotEmpty()
  imageUrl!: string;

  @ApiProperty({ description: 'Chú thích ảnh minh chứng (bắt buộc)' })
  @IsString()
  @IsNotEmpty()
  caption!: string;

  @ApiProperty({ description: 'Xác nhận cam kết bảo vệ quyền riêng tư (bắt buộc true)' })
  @IsOptional()
  privacyConfirmed?: boolean;
}
