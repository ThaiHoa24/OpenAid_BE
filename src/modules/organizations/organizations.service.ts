import { Injectable } from '@nestjs/common';
import { OrganizationsRepository } from './organizations.repository.js';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';
import { AddOrganizationMemberDto } from './dto/organization-member.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

@Injectable()
export class OrganizationsService {
  constructor(private readonly repository: OrganizationsRepository) {}

  async createOrganization(
    _actor: AuthenticatedUser,
    _dto: CreateOrganizationDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR04: create organization and ORGANIZER membership in one transaction',
    );
  }

  async getAllOrganizations(_query: PaginationDto): Promise<never> {
    return featureNotImplemented('FR04: public organization projection');
  }

  async getOrganizationById(_id: string): Promise<never> {
    return featureNotImplemented('FR04: public organization detail projection');
  }

  async updateOrganization(
    _actor: AuthenticatedUser,
    _id: string,
    _dto: UpdateOrganizationDto,
  ): Promise<never> {
    return featureNotImplemented('FR03/FR04: organization-scoped update');
  }

  async addMember(
    _actor: AuthenticatedUser,
    _organizationId: string,
    _dto: AddOrganizationMemberDto,
  ): Promise<never> {
    return featureNotImplemented('FR03: organization membership management');
  }
}
