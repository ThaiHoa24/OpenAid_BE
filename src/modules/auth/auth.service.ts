import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Prisma } from '@prisma/client';
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
