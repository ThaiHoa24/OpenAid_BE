import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DashboardService } from './dashboard.service.js';
import { CurrentUser } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Dashboard')
@ApiBearerAuth('JWT-auth')
@ApiResponse({
  status: 501,
  description:
    'Scaffold: Event dashboard and final report queries are pending.',
})
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly service: DashboardService) {}

  @Get('events/:eventId')
  overview(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.service.getOverviewStats(actor, eventId);
  }
}
