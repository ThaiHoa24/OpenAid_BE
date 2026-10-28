import { Injectable } from '@nestjs/common';
import { BatchesRepository } from './batches.repository.js';
import {
  CreateBatchDto,
  UpdateBatchDto,
  ReconcileBatchDto,
} from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { featureNotImplemented } from '../../common/utils/feature-not-implemented.js';

@Injectable()
export class BatchesService {
  constructor(private readonly repository: BatchesRepository) {}

  async createBatch(
    _actor: AuthenticatedUser,
    _dto: CreateBatchDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR15/FR16/FR20: same Event/type/unit, whole donations and Available to Reserved in one transaction',
    );
  }

  async getBatchById(_actor: AuthenticatedUser, _id: string): Promise<never> {
    return featureNotImplemented('FR03/FR16: organization-scoped Batch detail');
  }

  async getBatchesByEvent(
    _actor: AuthenticatedUser,
    _eventId: string,
  ): Promise<never> {
    return featureNotImplemented('FR03/FR16: organization-scoped Batch list');
  }

  async updateBatch(
    _actor: AuthenticatedUser,
    _id: string,
    _dto: UpdateBatchDto,
  ): Promise<never> {
    return featureNotImplemented('FR16/FR20: mark a valid Draft Batch Ready');
  }

  async reconcileBatch(
    _actor: AuthenticatedUser,
    _id: string,
    _dto: ReconcileBatchDto,
  ): Promise<never> {
    return featureNotImplemented(
      'FR15/FR19/FR20: returned/lost reconciliation and stock conservation',
    );
  }
}
