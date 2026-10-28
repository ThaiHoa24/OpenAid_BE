import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../database/prisma.service.js';
import { LoginDto, RegisterDto } from './dto/index.js';

@Injectable()
export class AuthService {
  constructor(
    private prisma: PrismaService,
    private jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });

    if (existing) {
      throw new BadRequestException('Email is already registered');
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: dto.email,
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
    });

    const token = this.generateToken(user.id, user.email, user.systemRole);

    return {
      user,
      accessToken: token,
    };
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
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
