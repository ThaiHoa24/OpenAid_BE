import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';

/**
 * Data-access boundary for organizations.
 * Add scoped queries and transaction-aware writes when implementing the use cases.
 * Authorization, state transitions and workflow orchestration belong to the service.
 */
@Injectable()
export class OrganizationsRepository {
  constructor(protected readonly prisma: PrismaService) {}
}
