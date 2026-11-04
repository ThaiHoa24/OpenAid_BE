import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { EventsService } from './events.service.js';
import {
  ChangeEventStatusDto,
  CreateEventDto,
  EventQueryDto,
  UpdateEventDto,
} from './dto/index.js';
import { CurrentUser, Public } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Public()
  @Get()
  @ApiOperation({
    summary: 'Public discovery: list and filter published events',
  })
  @ApiResponse({ status: 200, description: 'List of matching events' })
  getAll(@Query() query: EventQueryDto) {
    return this.service.getAllEvents(query);
  }

  @Public()
  @Get(':id')
  @ApiOperation({ summary: 'Public discovery: get event details by ID' })
  @ApiResponse({ status: 200, description: 'Event details' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  getById(@Param('id') id: string) {
    return this.service.getEventById(id);
  }

  @ApiBearerAuth('JWT-auth')
  @Post()
  @ApiOperation({
    summary: 'Create a new DRAFT event with volunteer roles and donation needs',
  })
  @ApiResponse({ status: 201, description: 'Event created in DRAFT status' })
  @ApiResponse({ status: 400, description: 'Invalid event data or date range' })
  @ApiResponse({
    status: 403,
    description: 'Caller is not an organizer of the organization',
  })
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateEventDto) {
    return this.service.createEvent(actor, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  @ApiOperation({ summary: 'Update event details and configurations' })
  @ApiResponse({ status: 200, description: 'Event updated' })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or invalid event state',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.service.updateEvent(actor, id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id/status')
  @ApiOperation({
    summary: 'Change event status (e.g. publish, close, cancel)',
  })
  @ApiResponse({ status: 200, description: 'Event status updated' })
  @ApiResponse({ status: 400, description: 'Invalid status transition' })
  @ApiResponse({
    status: 403,
    description: 'Organization not approved or insufficient permissions',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  changeStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ChangeEventStatusDto,
  ) {
    return this.service.changeStatus(actor, id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  @ApiOperation({ summary: 'Delete a DRAFT event' })
  @ApiResponse({ status: 200, description: 'Draft event deleted' })
  @ApiResponse({
    status: 400,
    description: 'Event is not in DRAFT status or has dependencies',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  deleteDraft(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteDraft(actor, id);
  }
}
