import { Injectable } from '@nestjs/common';
import { DonationsRepository } from './donations.repository.js';
import { CreateDonationDto, ReceiveDonationDto } from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

@Injectable()
export class DonationsService {
  constructor(private readonly repository: DonationsRepository) {}

  async createDonation(
    _donorId: string,
    _dto: CreateDonationDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR12: Donation Need, decimal quantity, Tracking ID and over-target warning',
    );
  }

  async getMyDonations(
    _donorId: string,
    _query: PaginationDto,
  ): Promise<never> {
    return featureNotImplemented('FR13: own donations');
  }

  async getEventDonations(
    _actor: AuthenticatedUser,
    _eventId: string,
    _query: PaginationDto,
  ): Promise<never> {
    return featureNotImplemented('FR03/FR14: organization-scoped donations');
  }

  async receiveDonation(
    _actor: AuthenticatedUser,
    _id: string,
    _dto: ReceiveDonationDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR14/FR15/FR20: receipt + Available stock + audit log in one transaction',
    );
  }

  async cancelDonation(_donorId: string, _id: string): Promise<never> {
    return featureNotImplemented(
      'FR12: cancel own pending donation with audit log',
    );
  }
}
