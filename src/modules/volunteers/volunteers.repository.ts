import { Injectable } from '@nestjs/common';
import { Prisma, VolunteerApplicationStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class VolunteersRepository {
  constructor(protected readonly prisma: PrismaService) {}

  async findRole(id: string, eventId: string) {
    return this.prisma.volunteerRole.findUnique({
      where: {
        id_eventId: {
          id,
          eventId,
        },
      },
    });
  }

  async findExistingApplication(eventId: string, userId: string) {
    return this.prisma.volunteerApplication.findUnique({
      where: {
        eventId_userId: {
          eventId,
          userId,
        },
      },
    });
  }

  async countApprovedApplicationsByRole(
    volunteerRoleId: string,
    tx?: Prisma.TransactionClient,
  ): Promise<number> {
    const client = tx ?? this.prisma;
    return client.volunteerApplication.count({
      where: {
        volunteerRoleId,
        status: VolunteerApplicationStatus.APPROVED,
      },
    });
  }

  async create(
    data: Prisma.VolunteerApplicationUncheckedCreateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.volunteerApplication.create({
      data,
      include: {
        volunteerRole: true,
        event: {
          select: {
            id: true,
            title: true,
            location: true,
            startDate: true,
          },
        },
      },
    });
  }

  async findById(id: string, tx?: Prisma.TransactionClient) {
    const client = tx ?? this.prisma;
    return client.volunteerApplication.findUnique({
      where: { id },
      include: {
        event: true,
        volunteerRole: true,
        user: {
          select: {
            id: true,
            fullName: true,
            email: true,
            phoneNumber: true,
          },
        },
        attendance: true,
      },
    });
  }

  async findMyApplications(userId: string) {
    return this.prisma.volunteerApplication.findMany({
      where: { userId },
      include: {
        event: {
          select: {
            id: true,
            title: true,
            location: true,
            startDate: true,
            status: true,
          },
        },
        volunteerRole: true,
        attendance: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findEventApplications(eventId: string) {
    return this.prisma.volunteerApplication.findMany({
      where: { eventId },
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
        attendance: true,
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async update(
    id: string,
    data: Prisma.VolunteerApplicationUncheckedUpdateInput,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.volunteerApplication.update({
      where: { id },
      data,
      include: {
        volunteerRole: true,
        attendance: true,
      },
    });
  }

  async upsertAttendanceCheckIn(
    applicationId: string,
    actorId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.volunteerAttendance.upsert({
      where: { applicationId },
      create: {
        applicationId,
        checkedInAt: new Date(),
        checkedInById: actorId,
        method: 'MANUAL',
      },
      update: {
        checkedInAt: new Date(),
        checkedInById: actorId,
        method: 'MANUAL',
      },
    });
  }

  async updateAttendanceCheckOut(
    applicationId: string,
    actorId: string,
    tx?: Prisma.TransactionClient,
  ) {
    const client = tx ?? this.prisma;
    return client.volunteerAttendance.update({
      where: { applicationId },
      data: {
        checkedOutAt: new Date(),
        checkedOutById: actorId,
      },
    });
  }
}
