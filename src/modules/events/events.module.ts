import { Module } from '@nestjs/common';
import { EventsService } from './events.service.js';
import { EventsController } from './events.controller.js';
import { EventsRepository } from './events.repository.js';

@Module({
  controllers: [EventsController],
  providers: [EventsService, EventsRepository],
  exports: [EventsService],
})
export class EventsModule {}
