import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { TransparencyService } from './transparency.service.js';
import { CurrentUser, Public, Roles } from '../../common/decorators/index.js';
import { SystemRole } from '../../common/enums/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';
import { TimelineQueryDto } from './dto/index.js';

@ApiTags('Transparency')
@ApiResponse({
  status: 501,
  description:
    'Scaffold: public tracking and timeline projections are pending.',
})
@Controller('transparency')
export class TransparencyController {
  constructor(private readonly service: TransparencyService) {}

  @Public()
  @Get('track/:trackingId')
  track(@Param('trackingId') trackingId: string) {
    return this.service.searchByTrackingId(trackingId);
  }

  @ApiBearerAuth('JWT-auth')
  @Get('timeline')
  timeline(
    @CurrentUser() actor: AuthenticatedUser,
    @Query() query: TimelineQueryDto,
  ) {
    return this.service.getTimeline(actor, query);
  }

  @ApiBearerAuth('JWT-auth')
  @Roles(SystemRole.ADMIN)
  @Get('logs')
  logs(@Query() query: PaginationDto) {
    return this.service.getRecentAuditLogs(query);
  }
}
