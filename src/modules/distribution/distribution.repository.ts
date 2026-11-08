import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class DistributionRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findTripBatch(tripBatchId: string) {
    return this.prisma.tripBatch.findUnique({
      where: { id: tripBatchId },
      include: {
        trip: true,
        batch: {
          include: {
            itemType: true,
            unit: true,
          },
        },
      },
    });
  }

  async findPoint(distributionPointId: string) {
    return this.prisma.distributionPoint.findUnique({
      where: { id: distributionPointId },
      include: {
        trip: true,
      },
    });
  }

  async createRecord(
    data: Prisma.DistributionRecordUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.distributionRecord.create({
      data,
      include: {
        point: true,
        tripBatch: {
          include: {
            batch: true,
          },
        },
      },
    });
  }

  async findRecordById(id: string) {
    return this.prisma.distributionRecord.findUnique({
      where: { id },
      include: {
        point: true,
        trip: true,
        confirmedBy: {
          select: {
            id: true,
            fullName: true,
            email: true,
          },
        },
        evidence: true,
      },
    });
  }

  async findRecordsByTrip(tripId: string) {
    return this.prisma.distributionRecord.findMany({
      where: { tripId },
      include: {
        point: true,
        tripBatch: {
          include: {
            batch: {
              include: {
                itemType: true,
                unit: true,
              },
            },
          },
        },
        evidence: true,
      },
      orderBy: { confirmedAt: 'asc' },
    });
  }

  async updatePoint(
    id: string,
    data: Prisma.DistributionPointUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.distributionPoint.update({
      where: { id },
      data,
    });
  }
}
