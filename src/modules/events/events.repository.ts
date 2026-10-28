import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

/**
 * Data-access boundary for events.
 * Add scoped queries and transaction-aware writes when implementing the use cases.
 * Authorization, state transitions and workflow orchestration belong to the service.
 */
@Injectable()
export class EventsRepository {
  constructor(protected readonly prisma: PrismaService) {}
}
