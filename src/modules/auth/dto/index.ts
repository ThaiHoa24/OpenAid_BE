import {
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'donor@gmail.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255)
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
  @MaxLength(255)
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: 'Nguyễn Văn A' })
  @IsString()
  @IsNotEmpty()
  @Matches(/\S/, { message: 'Full name must not be blank' })
  @MaxLength(150)
  fullName!: string;

  @ApiProperty({ example: '123456' })
  @IsString()
  @MinLength(6, { message: 'Password must be at least 6 characters' })
  @IsNotEmpty()
  password!: string;

  @ApiProperty({ example: '0901234567', required: false })
  @IsOptional()
  @IsString()
  @MaxLength(25)
  phoneNumber?: string;
}

export class SendRegisterOtpDto {
  @ApiProperty({ example: 'thaihoaa246@gmail.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255)
  @IsNotEmpty()
  email!: string;
}

export class VerifyRegisterDto extends RegisterDto {
  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'thaihoaa246@gmail.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255)
  @IsNotEmpty()
  email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ example: 'thaihoaa246@gmail.com' })
  @IsEmail({}, { message: 'Invalid email format' })
  @MaxLength(255)
  @IsNotEmpty()
  email!: string;

  @ApiProperty({ example: '123456', description: '6-digit OTP code' })
  @IsString()
  @IsNotEmpty()
  @Matches(/^\d{6}$/, { message: 'OTP must be exactly 6 digits' })
  otp!: string;

  @ApiProperty({ example: 'NewSecret123' })
  @IsString()
  @MinLength(6, { message: 'New password must be at least 6 characters' })
  @IsNotEmpty()
  newPassword!: string;
}
