import { Module } from '@nestjs/common';
import { BatchesService } from './batches.service.js';
import { BatchesController } from './batches.controller.js';
import { BatchesRepository } from './batches.repository.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { TransparencyModule } from '../transparency/transparency.module.js';

@Module({
  imports: [OrganizationsModule, TransparencyModule],
  controllers: [BatchesController],
  providers: [BatchesService, BatchesRepository],
  exports: [BatchesService, BatchesRepository],
})
export class BatchesModule {}
