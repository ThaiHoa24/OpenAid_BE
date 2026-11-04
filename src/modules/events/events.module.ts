import { Module } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { EventsController } from './events.controller.js';
import { EventsRepository } from './events.repository.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';
import { TransparencyModule } from '../transparency/transparency.module.js';

@Module({
  imports: [OrganizationsModule, TransparencyModule],
  controllers: [EventsController],
  providers: [EventsService, EventsRepository],
  exports: [EventsService, EventsRepository],
})
export class EventsModule {}
