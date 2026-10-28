import { Module } from '@nestjs/common';
import { TripsService } from './trips.service.js';
import { TripsController } from './trips.controller.js';
import { TripsRepository } from './trips.repository.js';

@Module({
  controllers: [TripsController],
  providers: [TripsService, TripsRepository],
  exports: [TripsService],
})
export class TripsModule {}
