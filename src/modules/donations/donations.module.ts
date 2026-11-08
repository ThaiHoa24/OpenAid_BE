import { Module } from '@nestjs/common';
import { DonationsService } from './donations.service.js';
import { DonationsController } from './donations.controller.js';
import { DonationsRepository } from './donations.repository.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { TransparencyModule } from '../transparency/transparency.module.js';

@Module({
  imports: [OrganizationsModule, TransparencyModule],
  controllers: [DonationsController],
  providers: [DonationsService, DonationsRepository],
  exports: [DonationsService, DonationsRepository],
})
export class DonationsModule {}
