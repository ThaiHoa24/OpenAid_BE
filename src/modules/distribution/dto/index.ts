import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DistributionPointStatus } from '../../../common/enums/index.js';

export class CreateDistributionDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  tripBatchId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  distributionPointId!: string;

  @ApiProperty({ minimum: 0.001 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  distributedQuantity!: number;

  @ApiPropertyOptional({ minimum: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  beneficiaryCount?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  notes?: string;
}

export class UpdateDistributionPointDto {
  @ApiProperty({ enum: DistributionPointStatus })
  @IsEnum(DistributionPointStatus)
  status!: DistributionPointStatus;

  @ApiPropertyOptional({
    description: 'Required by the use case when skipping a point.',
  })
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  skippedReason?: string;
}
