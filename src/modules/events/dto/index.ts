import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from '@nestjs/swagger';
import { PaginationDto } from '../../../common/dto/pagination.dto.js';
import { EventStatus } from '../../../common/enums/index.js';

export class VolunteerRoleInputDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  name!: string;

  @ApiProperty({ minimum: 1 })
  @IsInt()
  @Min(1)
  quantity!: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;
}

export class DonationNeedInputDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  itemTypeId!: string;

  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  unitId!: string;

  @ApiProperty({
    minimum: 0.001,
    description: 'Target quantity; pledges may exceed this target.',
  })
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  targetQuantity!: number;
}

export class CreateEventDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  organizationId!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  @MaxLength(200)
  title!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  location!: string;

  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  contactName!: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  contactPhone?: string;

  @ApiProperty({ format: 'date-time' })
  @IsDateString()
  startDate!: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  endDate?: string;

  @ApiPropertyOptional({ type: [VolunteerRoleInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => VolunteerRoleInputDto)
  volunteerRoles?: VolunteerRoleInputDto[];

  @ApiPropertyOptional({ type: [DonationNeedInputDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => DonationNeedInputDto)
  donationNeeds?: DonationNeedInputDto[];
}

export class UpdateEventDto extends PartialType(
  OmitType(CreateEventDto, ['organizationId'] as const),
) {}

export class EventQueryDto extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  area?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  from?: string;

  @ApiPropertyOptional({ format: 'date-time' })
  @IsOptional()
  @IsDateString()
  to?: string;

  @ApiPropertyOptional({ format: 'uuid' })
  @IsOptional()
  @IsUUID()
  itemTypeId?: string;
}

export class ChangeEventStatusDto {
  @ApiProperty({ enum: EventStatus })
  @IsEnum(EventStatus)
  status!: EventStatus;
}
