import { Module } from '@nestjs/common';
import { EvidenceService } from './evidence.service.js';
import { EvidenceController } from './evidence.controller.js';
import { StorageModule } from '../storage/storage.module.js';

@Module({
  imports: [StorageModule],
  controllers: [EvidenceController],
  providers: [EvidenceService],
  exports: [EvidenceService],
})
export class EvidenceModule {}
