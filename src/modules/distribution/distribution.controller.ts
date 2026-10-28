import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DistributionService } from './distribution.service.js';
import {
  CreateDistributionDto,
  UpdateDistributionPointDto,
} from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Distribution')
@ApiBearerAuth('JWT-auth')
@ApiResponse({
  status: 501,
  description: 'Scaffold: Distribution use cases are pending.',
})
@Controller('distribution')
export class DistributionController {
  constructor(private readonly service: DistributionService) {}

  @Post('records')
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateDistributionDto,
  ) {
    return this.service.createDistribution(actor, dto);
  }

  @Get('records/:id')
  getById(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getDistributionById(actor, id);
  }

  @Get('trip/:tripId')
  getByTrip(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('tripId') tripId: string,
  ) {
    return this.service.getDistributionsByTrip(actor, tripId);
  }

  @Patch('points/:id/status')
  updatePoint(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDistributionPointDto,
  ) {
    return this.service.updatePoint(actor, id, dto);
  }
}
