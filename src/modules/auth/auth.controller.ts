import { Controller, Post, Body, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { AuthService } from './auth.service.js';
import {
  LoginDto,
  RegisterDto,
  SendRegisterOtpDto,
  VerifyRegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/index.js';
import { Public } from '../../common/decorators/index.js';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('send-register-otp')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP to verify email for registration' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'OTP code successfully sent to email',
  })
  async sendRegisterOtp(@Body() dto: SendRegisterOtpDto) {
    return this.authService.sendRegisterOtp(dto);
  }

  @Public()
  @Post('verify-register')
  @ApiOperation({ summary: 'Verify OTP code and register user account' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully verified and registered',
  })
  async verifyRegister(@Body() dto: VerifyRegisterDto) {
    return this.authService.verifyRegister(dto);
  }

  @Public()
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Send OTP for password reset' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password reset OTP sent to email',
  })
  async forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.sendForgotPasswordOtp(dto);
  }

  @Public()
  @Post('reset-password')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset user password with OTP' })
  @ApiResponse({
    status: HttpStatus.OK,
    description: 'Password successfully reset',
  })
  async resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Register a new user account (direct without OTP)' })
  @ApiResponse({
    status: HttpStatus.CREATED,
    description: 'User successfully registered',
  })
  async register(@Body() dto: RegisterDto) {
    return this.authService.register(dto);
  }

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'User login' })
  @ApiResponse({ status: HttpStatus.OK, description: 'Login successful' })
  async login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }
}
