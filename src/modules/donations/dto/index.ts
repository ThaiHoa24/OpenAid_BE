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
  @ApiProperty({
    format: 'uuid',
    description: 'Event, item type and unit are resolved from this need.',
  })
  @IsUUID()
  donationNeedId!: string;

  @ApiProperty({ minimum: 0.001 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;
}

export class ReceiveDonationDto {
  @ApiProperty({ enum: [DonationStatus.RECEIVED, DonationStatus.REJECTED] })
  @IsIn([DonationStatus.RECEIVED, DonationStatus.REJECTED])
  status!: DonationStatus;

  @ApiPropertyOptional({
    description: 'Required by the use case when rejecting a donation.',
  })
  @IsOptional()
  @IsString()
  rejectionReason?: string;
}
