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
