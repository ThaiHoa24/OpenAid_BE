import {
  ArrayNotEmpty,
  ArrayUnique,
  IsArray,
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { BatchStatus } from '../../../common/enums/index.js';

export class CreateBatchDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  eventId!: string;

  @ApiProperty({
    type: [String],
    description:
      'Whole donations of the same Event, item type and unit. Quantity is calculated by the backend.',
  })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayUnique()
  @IsUUID('all', { each: true })
  donationIds!: string[];
}

export class UpdateBatchDto {
  @ApiProperty({
    enum: [BatchStatus.READY],
    description:
      'Assignment and distribution statuses are driven by their own use cases.',
  })
  @IsIn([BatchStatus.READY])
  status!: BatchStatus;
}

export class ReconcileBatchDto {
  @ApiProperty({ minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  returnedQuantity!: number;

  @ApiProperty({ minimum: 0 })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0)
  lostQuantity!: number;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  note!: string;
}
