import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';
import { TimelineQueryDto } from './dto/index.js';

@Injectable()
export class TransparencyService {
  constructor(private readonly prisma: PrismaService) {}

  async searchByTrackingId(_trackingId: string): Promise<never> {
    return featureNotImplemented(
      'FR21/FR22: public DTO, batch-level chain, chronological timeline, privacyConfirmed + APPROVED evidence, no donor/volunteer personal data',
    );
  }

  async getTimeline(
    _actor: AuthenticatedUser,
    _query: TimelineQueryDto,
  ): Promise<never> {
    return featureNotImplemented('FR03/FR21: authorized entity timeline');
  }

  async getRecentAuditLogs(_query: PaginationDto): Promise<never> {
    return featureNotImplemented('FR20: Admin audit log query');
  }
}
