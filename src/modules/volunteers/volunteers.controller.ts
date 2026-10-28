import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { VolunteersService } from './volunteers.service.js';
import { CreateVolunteerDto, ReviewVolunteerDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Volunteers')
@ApiBearerAuth('JWT-auth')
@ApiResponse({
  status: 501,
  description: 'Scaffold: Volunteer use cases are pending.',
})
@Controller('volunteers')
export class VolunteersController {
  constructor(private readonly service: VolunteersService) {}

  @Post('apply')
  apply(@CurrentUser('id') userId: string, @Body() dto: CreateVolunteerDto) {
    return this.service.registerVolunteer(userId, dto);
  }

  @Get('my')
  getMyApplications(@CurrentUser('id') userId: string) {
    return this.service.getMyApplications(userId);
  }

  @Get('event/:eventId')
  getByEvent(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.service.getEventVolunteers(actor, eventId);
  }

  @Patch(':id/review')
  review(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewVolunteerDto,
  ) {
    return this.service.reviewApplication(actor, id, dto);
  }

  @Post(':id/check-in')
  checkIn(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.checkIn(actor, id);
  }

  @Post(':id/check-out')
  checkOut(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.checkOut(actor, id);
  }
}
