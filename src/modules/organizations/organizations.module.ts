import { Module } from '@nestjs/common';
import { OrganizationsService } from './organizations.service.js';
import { OrganizationsController } from './organizations.controller.js';
import { OrganizationsRepository } from './organizations.repository.js';
import { OrganizationAccessService } from './organization-access.service.js';

@Module({
  controllers: [OrganizationsController],
  providers: [
    OrganizationsService,
    OrganizationsRepository,
    OrganizationAccessService,
  ],
  exports: [OrganizationsService, OrganizationAccessService],
})
export class OrganizationsModule {}
