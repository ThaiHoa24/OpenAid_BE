import { Injectable } from '@nestjs/common';
import type { Prisma, TransparencyEntityType } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

/**
 * Data access layer for Transparency Audit Logs.
 * Supports appending logs inside transactions and querying audit timelines.
 */
@Injectable()
export class TransparencyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Append a log entry. Uses transaction client if provided, else falls back to prisma.
   */
  async append(
    txOrPrisma: Prisma.TransactionClient | PrismaService,
    data: Prisma.TransparencyLogUncheckedCreateInput,
  ) {
    const client = txOrPrisma ?? this.prisma;
    return client.transparencyLog.create({
      data,
    });
  }

  /**
   * Query chronological timeline for an entity
   */
  async findTimeline(
    entityType: TransparencyEntityType,
    entityId: string,
    isPublicOnly = false,
  ) {
    return this.prisma.transparencyLog.findMany({
      where: {
        entityType,
        entityId,
        ...(isPublicOnly ? { isPublic: true } : {}),
      },
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            systemRole: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Query recent audit logs with pagination
   */
  async findRecentLogs(params: { skip?: number; take?: number }) {
    return this.prisma.transparencyLog.findMany({
      skip: params.skip,
      take: params.take,
      include: {
        actor: {
          select: {
            id: true,
            fullName: true,
            email: true,
            systemRole: true,
          },
        },
        event: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async countLogs() {
    return this.prisma.transparencyLog.count();
  }
}
