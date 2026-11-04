import { Injectable } from '@nestjs/common';
import { TransparencyRepository } from './transparency.repository.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { SystemRole } from '../../common/enums/index.js';
import { TimelineQueryDto } from './dto/index.js';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';

@Injectable()
export class TransparencyService {
  constructor(private readonly repository: TransparencyRepository) {}

  /**
   * KAN-18 / FR20: Admin audit logs query with skip & take
   */
  async getRecentAuditLogs(query: PaginationDto) {
    const skip = query.skip ?? 0;
    const take = query.take ?? 20;

    const [items, total] = await Promise.all([
      this.repository.findRecentLogs({ skip, take }),
      this.repository.countLogs(),
    ]);

    return {
      items,
      total,
      skip,
      take,
    };
  }

  /**
   * KAN-18 / FR21: Entity transparency timeline
   */
  async getTimeline(actor: AuthenticatedUser, query: TimelineQueryDto) {
    const isPublicOnly = actor.systemRole !== SystemRole.ADMIN;
    return this.repository.findTimeline(
      query.entityType,
      query.entityId,
      isPublicOnly,
    );
  }

  /**
   * Public tracking by trackingId (FR21/FR22 pending donation module)
   */
  async searchByTrackingId(_trackingId: string): Promise<never> {
    return featureNotImplemented(
      'FR21/FR22: public DTO, batch-level chain, chronological timeline, privacyConfirmed + APPROVED evidence, no donor/volunteer personal data',
    );
  }
}
