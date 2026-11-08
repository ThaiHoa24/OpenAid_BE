import { Module } from '@nestjs/common';
import { TripsService } from './trips.service.js';
import { TripsController } from './trips.controller.js';
import { TripsRepository } from './trips.repository.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { TransparencyModule } from '../transparency/transparency.module.js';

@Module({
  imports: [OrganizationsModule, TransparencyModule],
  controllers: [TripsController],
  providers: [TripsService, TripsRepository],
  exports: [TripsService, TripsRepository],
})
export class TripsModule {}
