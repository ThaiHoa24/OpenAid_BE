import { Module } from '@nestjs/common';
import { VolunteersService } from './volunteers.service.js';
import { VolunteersController } from './volunteers.controller.js';
import { VolunteersRepository } from './volunteers.repository.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { TransparencyModule } from '../transparency/transparency.module.js';

@Module({
  imports: [OrganizationsModule, TransparencyModule],
  controllers: [VolunteersController],
  providers: [VolunteersService, VolunteersRepository],
  exports: [VolunteersService, VolunteersRepository],
})
export class VolunteersModule {}
