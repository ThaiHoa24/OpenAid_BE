import { Module } from '@nestjs/common';
import { DistributionService } from './distribution.service.js';
import { DistributionController } from './distribution.controller.js';
import { DistributionRepository } from './distribution.repository.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { TransparencyModule } from '../transparency/transparency.module.js';

@Module({
  imports: [OrganizationsModule, TransparencyModule],
  controllers: [DistributionController],
  providers: [DistributionService, DistributionRepository],
  exports: [DistributionService, DistributionRepository],
})
export class DistributionModule {}
