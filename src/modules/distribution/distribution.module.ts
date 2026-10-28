import { Module } from '@nestjs/common';
import { DistributionService } from './distribution.service.js';
import { DistributionController } from './distribution.controller.js';
import { DistributionRepository } from './distribution.repository.js';

@Module({
  controllers: [DistributionController],
  providers: [DistributionService, DistributionRepository],
  exports: [DistributionService],
})
export class DistributionModule {}
