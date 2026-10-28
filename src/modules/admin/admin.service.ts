import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';
import { ReviewOrganizationDto, SetUserActiveDto } from './dto/index.js';

@Injectable()
export class AdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getPendingOrganizations(_query: PaginationDto): Promise<never> {
    return featureNotImplemented('FR24: pending Organization query');
  }

  async reviewOrganization(
    _actor: AuthenticatedUser,
    _id: string,
    _dto: ReviewOrganizationDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR04/FR20/FR24: Organization approval/suspension and audit log',
    );
  }

  async getAllUsers(_query: PaginationDto): Promise<never> {
    return featureNotImplemented('FR24: user administration projection');
  }

  async toggleUserActive(
    _actor: AuthenticatedUser,
    _id: string,
    _dto: SetUserActiveDto,
  ): Promise<never> {
    return featureNotImplemented('FR24: account enable/disable');
  }
}
