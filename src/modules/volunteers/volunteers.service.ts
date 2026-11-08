import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SystemRole, TransparencyEntityType } from '@prisma/client';
import { VolunteersRepository } from './volunteers.repository.js';
import { CreateVolunteerDto, ReviewVolunteerDto } from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import {
  EventStatus,
  VolunteerApplicationStatus,
} from '../../common/enums/index.js';
import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationAccessService } from '../organizations/organization-access.service.js';
import { TransparencyRepository } from '../transparency/transparency.repository.js';

@Injectable()
export class VolunteersService {
  constructor(
    private readonly repository: VolunteersRepository,
    private readonly prisma: PrismaService,
    private readonly organizationAccessService: OrganizationAccessService,
    private readonly transparencyRepo: TransparencyRepository,
  ) {}

  async registerVolunteer(userId: string, dto: CreateVolunteerDto) {
    const event = await this.prisma.event.findUnique({
      where: { id: dto.eventId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException(
        `Cannot apply to an event in ${event.status} status. Only PUBLISHED events accept applications.`,
      );
    }

    const role = await this.repository.findRole(
      dto.volunteerRoleId,
      dto.eventId,
    );
    if (!role) {
      throw new NotFoundException(
        'Volunteer role not found in the specified event',
      );
    }

    const existing = await this.repository.findExistingApplication(
      dto.eventId,
      userId,
    );
    if (existing) {
      throw new ConflictException(
        'You have already submitted a volunteer application for this event',
      );
    }

    const approvedCount = await this.repository.countApprovedApplicationsByRole(
      dto.volunteerRoleId,
    );
    if (approvedCount >= role.quantity) {
      throw new BadRequestException(
        `Volunteer role "${role.name}" has reached its maximum capacity of ${role.quantity}.`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const application = await this.repository.create(
        {
          eventId: dto.eventId,
          userId,
          volunteerRoleId: dto.volunteerRoleId,
          status: VolunteerApplicationStatus.PENDING,
          notes: dto.notes?.trim() || null,
        },
        tx,
      );

      await this.transparencyRepo.append(tx, {
        eventId: dto.eventId,
        actorId: userId,
        action: 'VOLUNTEER_APPLIED',
        entityType: TransparencyEntityType.VOLUNTEER_APPLICATION,
        entityId: application.id,
        newStatus: VolunteerApplicationStatus.PENDING,
        details: {
          roleName: role.name,
        },
        isPublic: false,
      });

      return application;
    });
  }

  async getMyApplications(userId: string) {
    return this.repository.findMyApplications(userId);
  }

  async getEventVolunteers(actor: AuthenticatedUser, eventId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        eventId,
      );
    }
    return this.repository.findEventApplications(eventId);
  }

  async reviewApplication(
    actor: AuthenticatedUser,
    id: string,
    dto: ReviewVolunteerDto,
  ) {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException('Volunteer application not found');
    }

    if (actor.systemRole !== SystemRole.ADMIN) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        application.eventId,
      );
    }

    if (dto.status === VolunteerApplicationStatus.APPROVED) {
      const approvedCount =
        await this.repository.countApprovedApplicationsByRole(
          application.volunteerRoleId,
        );
      if (approvedCount >= application.volunteerRole.quantity) {
        throw new BadRequestException(
          `Cannot approve application: Volunteer role capacity of ${application.volunteerRole.quantity} has been reached.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const updated = await this.repository.update(
        id,
        {
          status: dto.status,
          reviewedById: actor.id,
          reviewedAt: new Date(),
        },
        tx,
      );

      await this.transparencyRepo.append(tx, {
        eventId: application.eventId,
        actorId: actor.id,
        action: `VOLUNTEER_${dto.status}`,
        entityType: TransparencyEntityType.VOLUNTEER_APPLICATION,
        entityId: application.id,
        oldStatus: application.status,
        newStatus: dto.status,
        details: {
          roleName: application.volunteerRole.name,
        },
        isPublic: false,
      });

      return updated;
    });
  }

  async checkIn(actor: AuthenticatedUser, id: string) {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException('Volunteer application not found');
    }

    const isSelf = actor.id === application.userId;
    const isAdmin = actor.systemRole === SystemRole.ADMIN;
    if (!isSelf && !isAdmin) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        application.eventId,
      );
    }

    if (application.status !== VolunteerApplicationStatus.APPROVED) {
      throw new BadRequestException(
        'Only APPROVED volunteers can be checked in',
      );
    }

    if (application.event.status === EventStatus.CANCELLED) {
      throw new BadRequestException('Cannot check in to a CANCELLED event');
    }

    if (application.attendance?.checkedInAt) {
      throw new BadRequestException('Volunteer has already checked in');
    }

    return this.prisma.$transaction(async (tx) => {
      const attendance = await this.repository.upsertAttendanceCheckIn(
        id,
        actor.id,
        tx,
      );

      await this.transparencyRepo.append(tx, {
        eventId: application.eventId,
        actorId: actor.id,
        action: 'VOLUNTEER_CHECKED_IN',
        entityType: TransparencyEntityType.VOLUNTEER_APPLICATION,
        entityId: application.id,
        details: {
          volunteerId: application.userId,
          method: 'MANUAL',
        },
        isPublic: false,
      });

      return attendance;
    });
  }

  async checkOut(actor: AuthenticatedUser, id: string) {
    const application = await this.repository.findById(id);
    if (!application) {
      throw new NotFoundException('Volunteer application not found');
    }

    const isSelf = actor.id === application.userId;
    const isAdmin = actor.systemRole === SystemRole.ADMIN;
    if (!isSelf && !isAdmin) {
      await this.organizationAccessService.requireEventOrganizer(
        actor.id,
        application.eventId,
      );
    }

    if (application.status !== VolunteerApplicationStatus.APPROVED) {
      throw new BadRequestException(
        'Only APPROVED volunteers can be checked out',
      );
    }

    if (!application.attendance?.checkedInAt) {
      throw new BadRequestException(
        'Volunteer must be checked in before checking out',
      );
    }

    if (application.attendance?.checkedOutAt) {
      throw new BadRequestException('Volunteer has already checked out');
    }

    return this.prisma.$transaction(async (tx) => {
      const attendance = await this.repository.updateAttendanceCheckOut(
        id,
        actor.id,
        tx,
      );

      await this.transparencyRepo.append(tx, {
        eventId: application.eventId,
        actorId: actor.id,
        action: 'VOLUNTEER_CHECKED_OUT',
        entityType: TransparencyEntityType.VOLUNTEER_APPLICATION,
        entityId: application.id,
        details: {
          volunteerId: application.userId,
          method: 'MANUAL',
        },
        isPublic: false,
      });

      return attendance;
    });
  }
}
