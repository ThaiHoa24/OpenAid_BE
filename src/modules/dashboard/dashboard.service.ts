import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getOverviewStats(
    _actor: AuthenticatedUser,
    _eventId: string,
  ): Promise<never> {
    return featureNotImplemented(
      'FR23: scoped Event summary; Needed/Pledged/Received/Distributed by item/unit; final report from queries',
    );
  }
}
