import {
  IsOptional,
  IsString,
  IsUrl,
  Matches,
  MaxLength,
  ValidateIf,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional({ maxLength: 150 })
  @ValidateIf((_object, value) => value !== undefined)
  @IsString()
  @Matches(/\S/, { message: 'Full name must not be blank' })
  @MaxLength(150)
  fullName?: string;

  @ApiPropertyOptional({ maxLength: 25 })
  @IsOptional()
  @IsString()
  @MaxLength(25)
  phoneNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
