import { Module } from '@nestjs/common';
import { DonationsService } from './donations.service.js';
import { DonationsController } from './donations.controller.js';
import { DonationsRepository } from './donations.repository.js';

@Module({
  controllers: [DonationsController],
  providers: [DonationsService, DonationsRepository],
  exports: [DonationsService],
})
export class DonationsModule {}
