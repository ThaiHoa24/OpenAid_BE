import { IsEmail, IsEnum, IsOptional, IsUUID } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { OrganizationRole } from '../../../common/enums/index.js';

export class AddOrganizationMemberDto {
  @ApiPropertyOptional({ format: 'uuid', description: 'ID của tài khoản người dùng' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ format: 'email', description: 'Email của người dùng để mời vào tổ chức' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ enum: OrganizationRole, description: 'Vai trò: MEMBER hoặc ORGANIZER' })
  @IsEnum(OrganizationRole)
  role!: OrganizationRole;
}
