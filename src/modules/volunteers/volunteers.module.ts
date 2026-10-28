import { Module } from '@nestjs/common';
import { VolunteersService } from './volunteers.service.js';
import { VolunteersController } from './volunteers.controller.js';
import { VolunteersRepository } from './volunteers.repository.js';

@Module({
  controllers: [VolunteersController],
  providers: [VolunteersService, VolunteersRepository],
  exports: [VolunteersService],
})
export class VolunteersModule {}
