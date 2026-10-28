import { Injectable } from '@nestjs/common';
import { EventsRepository } from './events.repository.js';
import {
  CreateEventDto,
  UpdateEventDto,
  EventQueryDto,
  ChangeEventStatusDto,
} from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';

@Injectable()
export class EventsService {
  constructor(private readonly repository: EventsRepository) {}

  async createEvent(
    _actor: AuthenticatedUser,
    _dto: CreateEventDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR05/FR06: create Event with roles and donation needs',
    );
  }

  async getAllEvents(_query: EventQueryDto): Promise<never> {
    return featureNotImplemented(
      'FR07: public published Event discovery and filters',
    );
  }

  async getEventById(_id: string): Promise<never> {
    return featureNotImplemented('FR05: public Event detail');
  }

  async updateEvent(
    _actor: AuthenticatedUser,
    _id: string,
    _dto: UpdateEventDto,
  ): Promise<never> {
    return featureNotImplemented('FR03/FR05: Organizer update');
  }

  async changeStatus(
    _actor: AuthenticatedUser,
    _id: string,
    _dto: ChangeEventStatusDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR05/FR20: approved Organization, status transition and audit log',
    );
  }

  async deleteDraft(_actor: AuthenticatedUser, _id: string): Promise<never> {
    return featureNotImplemented('FR05: only Draft Events may be deleted');
  }
}
