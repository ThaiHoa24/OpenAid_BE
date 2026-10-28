import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

/**
 * Data-access boundary for trips.
 * Add scoped queries and transaction-aware writes when implementing the use cases.
 * Authorization, state transitions and workflow orchestration belong to the service.
 */
@Injectable()
export class TripsRepository {
  constructor(protected readonly prisma: PrismaService) {}
}
