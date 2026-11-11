import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import {
  LoginDto,
  RegisterDto,
  SendRegisterOtpDto,
  VerifyRegisterDto,
  ForgotPasswordDto,
  ResetPasswordDto,
} from './dto/index.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  private generateOtp(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
  }

  async sendRegisterOtp(dto: SendRegisterOtpDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (existing) {
      throw new BadRequestException('Email đã được đăng ký tài khoản.');
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate old unverified register OTPs for this email
    await this.prisma.otpVerification.updateMany({
      where: { email, type: 'REGISTER', isUsed: false },
      data: { isUsed: true },
    });

    await this.prisma.otpVerification.create({
      data: {
        email,
        code: otp,
        type: 'REGISTER',
        expiresAt,
      },
    });

    await this.mailService.sendRegisterOtp(email, otp);

    return {
      success: true,
      message: 'Mã xác thực đã được gửi tới email của bạn.',
    };
  }

  async verifyRegister(dto: VerifyRegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        email,
        code: dto.otp.trim(),
        type: 'REGISTER',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Mã OTP không chính xác hoặc đã hết hạn.');
    }

    // Mark OTP as used
    await this.prisma.otpVerification.update({
      where: { id: otpRecord.id },
      data: { isUsed: true },
    });

    // Complete registration
    return this.register(dto);
  }

  async sendForgotPasswordOtp(dto: ForgotPasswordDto) {
    const email = dto.email.trim().toLowerCase();
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!user) {
      throw new BadRequestException('Không tìm thấy tài khoản với email này.');
    }

    const otp = this.generateOtp();
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

    // Invalidate old unused forgot password OTPs
    await this.prisma.otpVerification.updateMany({
      where: { email, type: 'FORGOT_PASSWORD', isUsed: false },
      data: { isUsed: true },
    });

    await this.prisma.otpVerification.create({
      data: {
        email,
        code: otp,
        type: 'FORGOT_PASSWORD',
        expiresAt,
      },
    });

    await this.mailService.sendForgotPasswordOtp(email, otp);

    return {
      success: true,
      message: 'Mã xác thực đặt lại mật khẩu đã được gửi đến email của bạn.',
    };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const email = dto.email.trim().toLowerCase();

    const otpRecord = await this.prisma.otpVerification.findFirst({
      where: {
        email,
        code: dto.otp.trim(),
        type: 'FORGOT_PASSWORD',
        isUsed: false,
        expiresAt: { gt: new Date() },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!otpRecord) {
      throw new BadRequestException('Mã OTP không chính xác hoặc đã hết hạn.');
    }

    const user = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (!user) {
      throw new BadRequestException('Không tìm thấy tài khoản tương ứng.');
    }

    const passwordHash = await bcrypt.hash(dto.newPassword, 10);

    await this.prisma.$transaction([
      this.prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      }),
      this.prisma.otpVerification.update({
        where: { id: otpRecord.id },
        data: { isUsed: true },
      }),
    ]);

    return {
      success: true,
      message: 'Đặt lại mật khẩu thành công. Bạn có thể đăng nhập bằng mật khẩu mới.',
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();
    const existing = await this.prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } },
    });

    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user
      .create({
        data: {
          email,
          fullName: dto.fullName,
          passwordHash,
          phoneNumber: dto.phoneNumber,
        },
        select: {
          id: true,
          email: true,
          fullName: true,
          systemRole: true,
          createdAt: true,
        },
      })
      .catch((error: unknown) => {
        // PostgreSQL also enforces LOWER(email); concurrent signups may race.
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === 'P2002'
        ) {
          throw new BadRequestException('Email is already registered');
        }
        throw error;
      });

    const token = this.generateToken(user.id, user.email, user.systemRole);

    return {
      user,
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findFirst({
      where: { email: { equals: dto.email.trim(), mode: 'insensitive' } },
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const isMatch = await bcrypt.compare(dto.password, user.passwordHash);
    if (!isMatch) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user.id, user.email, user.systemRole);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        systemRole: user.systemRole,
      },
      accessToken: token,
    };
  }

  private generateToken(
    userId: string,
    email: string,
    systemRole: string,
  ): string {
    return this.jwtService.sign({
      sub: userId,
      email,
      systemRole,
    });
  }
}
