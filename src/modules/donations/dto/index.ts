import {
  IsIn,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DonationStatus } from '../../../common/enums/index.js';

export class CreateDonationDto {
  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Event, item type and unit are resolved from this need.',
  })
  @IsOptional()
  @IsUUID()
  donationNeedId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Event ID (optional if donationNeedId is provided).',
  })
  @IsOptional()
  @IsUUID()
  eventId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Item type ID (optional if donationNeedId is provided).',
  })
  @IsOptional()
  @IsUUID()
  itemTypeId?: string;

  @ApiPropertyOptional({
    format: 'uuid',
    description: 'Unit ID (optional if donationNeedId is provided).',
  })
  @IsOptional()
  @IsUUID()
  unitId?: string;

  @ApiProperty({
    minimum: 0.001,
    description: 'Quantity of in-kind goods pledged.',
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;
}

export class ReceiveDonationDto {
  @ApiProperty({
    enum: [DonationStatus.RECEIVED, DonationStatus.REJECTED],
    description: 'Receipt decision: RECEIVED (Approve) or REJECTED.',
  })
  @IsIn([DonationStatus.RECEIVED, DonationStatus.REJECTED])
  status!: DonationStatus;

  @ApiPropertyOptional({
    description: 'Required by the use case when rejecting a donation.',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;

  @ApiPropertyOptional({
    minimum: 0.001,
    description: 'Actual received quantity (defaults to pledged quantity).',
  })
  @IsOptional()
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  receivedQuantity?: number;
}
