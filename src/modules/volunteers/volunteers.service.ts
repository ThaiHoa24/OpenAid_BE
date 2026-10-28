import { Injectable } from '@nestjs/common';
import { VolunteersRepository } from './volunteers.repository.js';
import { CreateVolunteerDto, ReviewVolunteerDto } from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';

@Injectable()
export class VolunteersService {
  constructor(private readonly repository: VolunteersRepository) {}

  async registerVolunteer(
    _userId: string,
    _dto: CreateVolunteerDto,
  ): Promise<never> {
    return featureNotImplemented('FR08: choose an Event role and apply');
  }

  async getMyApplications(_userId: string): Promise<never> {
    return featureNotImplemented('FR10: own volunteer activities');
  }

  async getEventVolunteers(
    _actor: AuthenticatedUser,
    _eventId: string,
  ): Promise<never> {
    return featureNotImplemented(
      'FR03/FR09: organization-scoped application list',
    );
  }

  async reviewApplication(
    _actor: AuthenticatedUser,
    _id: string,
    _dto: ReviewVolunteerDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR09/FR20: review application with audit log',
    );
  }

  async checkIn(_actor: AuthenticatedUser, _id: string): Promise<never> {
    return featureNotImplemented(
      'FR11: record attendance for an approved application',
    );
  }

  async checkOut(_actor: AuthenticatedUser, _id: string): Promise<never> {
    return featureNotImplemented('FR11: record check-out after check-in');
  }
}
