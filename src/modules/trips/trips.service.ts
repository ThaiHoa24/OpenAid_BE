import { Injectable } from '@nestjs/common';
import { TripsRepository } from './trips.repository.js';
import { CreateTripDto, UpdateTripDto } from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

@Injectable()
export class TripsService {
  constructor(private readonly repository: TripsRepository) {}

  async createTrip(
    _actor: AuthenticatedUser,
    _dto: CreateTripDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR17: same Event batches, approved applications, exactly one Leader and ordered points',
    );
  }

  async getTripById(_actor: AuthenticatedUser, _id: string): Promise<never> {
    return featureNotImplemented('FR03/FR17: authorized Trip detail');
  }

  async getTripsByEvent(
    _actor: AuthenticatedUser,
    _eventId: string,
    _query: PaginationDto,
  ): Promise<never> {
    return featureNotImplemented('FR03/FR17: authorized Event Trip list');
  }

  async updateTrip(
    _actor: AuthenticatedUser,
    _id: string,
    _dto: UpdateTripDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR18/FR20: Organizer/Leader authorization, transitions, completion/cancellation and unassignment',
    );
  }
}
