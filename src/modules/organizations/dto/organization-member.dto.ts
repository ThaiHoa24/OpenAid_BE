import { IsEnum, IsUUID } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { OrganizationRole } from '../../../common/enums/index.js';

export class AddOrganizationMemberDto {
  @ApiProperty({ format: 'uuid' })
  @IsUUID()
  userId!: string;

  @ApiProperty({ enum: OrganizationRole })
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
