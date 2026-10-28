import { IsBoolean, IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrgStatus } from '../../../common/enums/index.js';

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
