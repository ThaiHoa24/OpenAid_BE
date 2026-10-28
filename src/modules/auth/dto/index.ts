import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'donor@gmail.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @IsNotEmpty()
  password!: string;
}

export class RegisterDto {
  @ApiProperty({ example: 'donor@gmail.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  fullName!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: '0901234567', required: false })
  @IsOptional()
  @IsString()
  phoneNumber?: string;
}
