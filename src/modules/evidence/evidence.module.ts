import { Module } from '@nestjs/common';
import { EvidenceService } from './evidence.service.js';
import { EvidenceController } from './evidence.controller.js';
import { StorageModule } from '../storage/storage.module.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { TransparencyModule } from '../transparency/transparency.module.js';

@Module({
  imports: [StorageModule, OrganizationsModule, TransparencyModule],
  controllers: [EvidenceController],
  providers: [EvidenceService],
  exports: [EvidenceService],
})
export class EvidenceModule {}
