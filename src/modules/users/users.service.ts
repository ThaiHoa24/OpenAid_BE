import { Injectable, NotFoundException } from '@nestjs/common';
import { UsersRepository } from './users.repository.js';
import { UpdateUserDto } from './dto/index.js';

@Injectable()
export class UsersService {
  constructor(private usersRepo: UsersRepository) {}

  async getProfile(userId: string) {
    const user = await this.usersRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return user;
  }

  async getAllUsers(skip = 0, take = 20) {
    return this.usersRepo.findAll(skip, take);
  }

  async updateProfile(userId: string, dto: UpdateUserDto) {
    await this.getProfile(userId);
    return this.usersRepo.update(userId, dto);
  }
}
