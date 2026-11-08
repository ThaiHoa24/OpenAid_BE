import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class TripsRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async create(
    data: Prisma.TripUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.trip.create({
      data,
      include: {
        batches: {
          include: {
            batch: true,
          },
        },
        volunteers: {
          include: {
            application: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phoneNumber: true,
                  },
                },
              },
            },
          },
        },
        points: {
          orderBy: { position: 'asc' },
        },
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.trip.findUnique({
      where: { id },
      include: {
        event: true,
        batches: {
          include: {
            batch: {
              include: {
                itemType: true,
                unit: true,
              },
            },
          },
        },
        volunteers: {
          include: {
            application: {
              include: {
                user: {
                  select: {
                    id: true,
                    fullName: true,
                    email: true,
                    phoneNumber: true,
                  },
                },
                volunteerRole: true,
              },
            },
          },
        },
        points: {
          orderBy: { position: 'asc' },
          include: {
            records: true,
            evidence: true,
          },
        },
        evidence: true,
      },
    });
  }

  async findByEvent(eventId: string, skip = 0, take = 20) {
    const [items, total] = await Promise.all([
      this.prisma.trip.findMany({
        where: { eventId },
        skip,
        take,
        orderBy: { departureDate: 'desc' },
        include: {
          batches: {
            include: {
              batch: {
                include: {
                  itemType: true,
                  unit: true,
                },
              },
            },
          },
          volunteers: {
            include: {
              application: {
                include: {
                  user: {
                    select: {
                      id: true,
                      fullName: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          points: {
            orderBy: { position: 'asc' },
          },
        },
      }),
      this.prisma.trip.count({ where: { eventId } }),
    ]);

    return { items, total, skip, take };
  }

  async update(
    id: string,
    data: Prisma.TripUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.trip.update({
      where: { id },
      data,
      include: {
        batches: true,
        points: true,
      },
    });
  }
}
