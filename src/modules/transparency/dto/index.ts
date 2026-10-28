import { IsEnum, IsString } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { TransparencyEntityType } from '../../../common/enums/index.js';

export class TimelineQueryDto {
  @ApiProperty({ enum: TransparencyEntityType })
  @IsEnum(TransparencyEntityType)
  entityType!: TransparencyEntityType;

  @ApiProperty()
  @IsString()
  entityId!: string;
}
