import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { UpdateUserDto } from './dto/index.js';

@Injectable()
export class UsersRepository {
  constructor(private prisma: PrismaService) {}

  async findById(id: string) {
    return this.prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        systemRole: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async findByEmail(email: string) {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findAll(skip = 0, take = 20) {
    return this.prisma.user.findMany({
      skip,
      take,
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        systemRole: true,
        isActive: true,
        createdAt: true,
      },
    });
  }

  async update(id: string, data: UpdateUserDto) {
    return this.prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        fullName: true,
        phoneNumber: true,
        avatarUrl: true,
        systemRole: true,
        updatedAt: true,
      },
    });
  }
}
