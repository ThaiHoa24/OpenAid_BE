import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../database/prisma.service.js';
import { OrganizationRole, OrgStatus } from '../../common/enums/index.js';

/** Authorization foundation for future Organization/Event workflow services. */
@Injectable()
export class OrganizationAccessService {
  constructor(private readonly prisma: PrismaService) {}

  async requireOrganizer(userId: string, organizationId: string) {
    const member = await this.prisma.organizationMember.findUnique({
      where: { userId_organizationId: { userId, organizationId } },
      include: { organization: true },
    });
    if (!member || member.role !== OrganizationRole.ORGANIZER) {
      throw new ForbiddenException(
        'Organizer permission is required for this organization',
      );
    }
    return member;
  }

  async requireApprovedOrganizer(userId: string, organizationId: string) {
    const member = await this.requireOrganizer(userId, organizationId);
    if (member.organization.status !== OrgStatus.APPROVED) {
      throw new ForbiddenException(
        'The organization must be approved before publishing events',
      );
    }
    return member;
  }
}
