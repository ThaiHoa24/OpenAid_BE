import {
  Injectable,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { OrganizationsRepository } from './organizations.repository.js';
import { OrganizationAccessService } from './organization-access.service.js';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { AddOrganizationMemberDto } from './dto/organization-member.dto.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';

@Injectable()
export class OrganizationsService {
  constructor(
    private readonly repository: OrganizationsRepository,
    private readonly accessService: OrganizationAccessService,
  ) {}

  async createOrganization(
    actor: AuthenticatedUser,
    dto: CreateOrganizationDto,
  ) {
    const existingCode = await this.repository.findByCode(
      dto.code.trim().toUpperCase(),
    );
    if (existingCode) {
      throw new ConflictException('Organization code already exists');
    }

    return this.repository.createWithOrganizer(dto, actor.id);
  }

  async getAllOrganizations(query: PaginationDto) {
    return this.repository.findMany(query.skip, query.take);
  }

  async getOrganizationById(id: string) {
    const org = await this.repository.findById(id);
    if (!org) {
      throw new NotFoundException('Organization not found');
    }
    return org;
  }

  async updateOrganization(
    actor: AuthenticatedUser,
    id: string,
    dto: UpdateOrganizationDto,
  ) {
    await this.accessService.requireOrganizer(actor.id, id);
    return this.repository.update(id, dto);
  }

  async addMember(
    actor: AuthenticatedUser,
    organizationId: string,
    dto: AddOrganizationMemberDto,
  ) {
    await this.accessService.requireOrganizer(actor.id, organizationId);

    let targetUserId = dto.userId;

    if (!targetUserId && dto.email) {
      const user = await this.repository.findUserByEmail(dto.email);
      if (!user) {
        throw new NotFoundException(`Không tìm thấy tài khoản với email ${dto.email}`);
      }
      targetUserId = user.id;
    }

    if (!targetUserId) {
      throw new BadRequestException('Vui lòng cung cấp userId hoặc email của thành viên cần thêm.');
    }

    const existingMember = await this.repository.findMember(
      organizationId,
      targetUserId,
    );
    if (existingMember) {
      throw new ConflictException(
        'User is already a member of this organization',
      );
    }

    return this.repository.addMember(organizationId, targetUserId, dto.role);
  }
}
