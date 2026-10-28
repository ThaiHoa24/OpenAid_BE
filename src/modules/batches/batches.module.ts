import { Module } from '@nestjs/common';
import { BatchesService } from './batches.service.js';
import { BatchesController } from './batches.controller.js';
import { BatchesRepository } from './batches.repository.js';

@Module({
  controllers: [BatchesController],
  providers: [BatchesService, BatchesRepository],
  exports: [BatchesService],
})
export class BatchesModule {}
