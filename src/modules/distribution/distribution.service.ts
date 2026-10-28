import { Injectable } from '@nestjs/common';
import { DistributionRepository } from './distribution.repository.js';
import {
  CreateDistributionDto,
  UpdateDistributionPointDto,
} from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';

@Injectable()
export class DistributionService {
  constructor(private readonly repository: DistributionRepository) {}

  async createDistribution(
    _actor: AuthenticatedUser,
    _dto: CreateDistributionDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR19/FR20: Batch + Point quantity cap, Reserved to Distributed and audit log in one transaction',
    );
  }

  async getDistributionById(
    _actor: AuthenticatedUser,
    _id: string,
  ): Promise<never> {
    return featureNotImplemented('FR03/FR19: authorized distribution record');
  }

  async getDistributionsByTrip(
    _actor: AuthenticatedUser,
    _tripId: string,
  ): Promise<never> {
    return featureNotImplemented(
      'FR03/FR19: authorized Trip distribution records',
    );
  }

  async updatePoint(
    _actor: AuthenticatedUser,
    _id: string,
    _dto: UpdateDistributionPointDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR18/FR20: Organizer/Leader Point transition',
    );
  }
}
