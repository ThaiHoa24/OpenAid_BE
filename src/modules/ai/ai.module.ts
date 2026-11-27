import { Module } from '@nestjs/common';
import { AiController } from './ai.controller.js';
import { AiService } from './ai.service.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';

@Module({
  controllers: [AiController],
  providers: [
    AiService,
    OrganizationAccessService,
    TransparencyRepository,
  ],
  exports: [AiService],
})
export class AiModule {}
