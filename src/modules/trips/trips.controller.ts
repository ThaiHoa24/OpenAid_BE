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
import { TripsService } from './trips.service.js';
import { CreateTripDto, UpdateTripDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Trips')
@ApiBearerAuth('JWT-auth')
@ApiResponse({
  status: 501,
  description: 'Scaffold: Trip use cases are pending.',
})
@Controller('trips')
export class TripsController {
  constructor(private readonly service: TripsService) {}

  @Get('event/:eventId')
  getByEvent(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Query() query: PaginationDto,
  ) {
    return this.service.getTripsByEvent(actor, eventId, query);
  }

  @Get(':id')
  getById(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getTripById(actor, id);
  }

  @Post()
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateTripDto) {
    return this.service.createTrip(actor, dto);
  }

  @Patch(':id/status')
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateTripDto,
  ) {
    return this.service.updateTrip(actor, id, dto);
  }
}
