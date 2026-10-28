import { Body, Controller, Get, Param, Patch, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AdminService } from './admin.service.js';
import { CurrentUser, Roles } from '../../common/decorators/index.js';
import { SystemRole } from '../../common/enums/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { ReviewOrganizationDto, SetUserActiveDto } from './dto/index.js';

@ApiTags('Admin')
@ApiBearerAuth('JWT-auth')
@ApiResponse({
  status: 501,
  description: 'Scaffold: Admin use cases are pending.',
})
@Roles(SystemRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(private readonly service: AdminService) {}

  @Get('organizations/pending')
  pendingOrganizations(@Query() query: PaginationDto) {
    return this.service.getPendingOrganizations(query);
  }

  @Patch('organizations/:id/review')
  reviewOrganization(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewOrganizationDto,
  ) {
    return this.service.reviewOrganization(actor, id, dto);
  }

  @Get('users')
  users(@Query() query: PaginationDto) {
    return this.service.getAllUsers(query);
  }

  @Patch('users/:id/active')
  setUserActive(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: SetUserActiveDto,
  ) {
    return this.service.toggleUserActive(actor, id, dto);
  }
}
