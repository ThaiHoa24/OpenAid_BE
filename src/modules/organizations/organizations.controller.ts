import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { OrganizationsService } from './organizations.service.js';
import { CreateOrganizationDto, UpdateOrganizationDto } from './dto/index.js';
import { AddOrganizationMemberDto } from './dto/organization-member.dto.js';
import { CurrentUser, Public } from '../../common/decorators/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Organizations')
@ApiResponse({
  status: 501,
  description: 'Scaffold: Organization use cases are pending.',
})
@Controller('organizations')
export class OrganizationsController {
  constructor(private readonly service: OrganizationsService) {}

  @Public()
  @Get()
  getAll(@Query() query: PaginationDto) {
    return this.service.getAllOrganizations(query);
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getOrganizationById(id);
  }

  @ApiBearerAuth('JWT-auth')
  @Post()
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateOrganizationDto,
  ) {
    return this.service.createOrganization(actor, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateOrganizationDto,
  ) {
    return this.service.updateOrganization(actor, id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Post(':id/members')
  addMember(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: AddOrganizationMemberDto,
  ) {
    return this.service.addMember(actor, id, dto);
  }
}
