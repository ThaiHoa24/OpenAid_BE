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
  DonationNeedInputDto,
  EventQueryDto,
  UpdateDonationNeedDto,
  UpdateEventDto,
  UpdateVolunteerRoleDto,
  VolunteerRoleInputDto,
} from './dto/index.js';
import { CurrentUser, Public } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Events')
@Controller('events')
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Public()
  @Get('catalogs/item-types')
  @ApiOperation({ summary: 'Public catalog: get active item types' })
  @ApiResponse({ status: 200, description: 'List of active item types' })
  getItemTypes() {
    return this.service.getActiveItemTypes();
  }

  @Public()
  @Get('catalogs/units')
  @ApiOperation({ summary: 'Public catalog: get active measurement units' })
  @ApiResponse({ status: 200, description: 'List of active units' })
  getUnits() {
    return this.service.getActiveUnits();
  }

  @ApiBearerAuth('JWT-auth')
  @Patch('donation-needs/:id')
  @ApiOperation({
    summary: 'EVT-SUB: Update an individual donation need by ID',
  })
  @ApiResponse({ status: 200, description: 'Donation need updated' })
  @ApiResponse({ status: 400, description: 'Invalid data or state' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Donation need not found' })
  updateDonationNeedById(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateDonationNeedDto,
  ) {
    return this.service.updateDonationNeed(actor, id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete('donation-needs/:id')
  @ApiOperation({
    summary: 'EVT-SUB: Delete an individual donation need by ID',
  })
  @ApiResponse({ status: 200, description: 'Donation need removed' })
  @ApiResponse({
    status: 400,
    description: 'Event not in DRAFT status or has existing donations',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Donation need not found' })
  removeDonationNeedById(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.removeDonationNeedById(actor, id);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch('volunteer-roles/:id')
  @ApiOperation({
    summary: 'EVT-SUB: Update an individual volunteer role by ID',
  })
  @ApiResponse({ status: 200, description: 'Volunteer role updated' })
  @ApiResponse({ status: 400, description: 'Invalid data or duplicate name' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Volunteer role not found' })
  updateVolunteerRoleById(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateVolunteerRoleDto,
  ) {
    return this.service.updateVolunteerRole(actor, id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete('volunteer-roles/:id')
  @ApiOperation({
    summary: 'EVT-SUB: Delete an individual volunteer role by ID',
  })
  @ApiResponse({ status: 200, description: 'Volunteer role removed' })
  @ApiResponse({
    status: 400,
    description: 'Volunteer role has existing applications',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Volunteer role not found' })
  removeVolunteerRoleById(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.removeVolunteerRole(actor, id);
  }

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

  @Public()
  @Get(':id/donation-needs')
  @ApiOperation({
    summary: 'Public discovery: get donation needs for an event',
  })
  @ApiResponse({ status: 200, description: 'List of donation needs' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  getDonationNeeds(@Param('id') id: string) {
    return this.service.getDonationNeeds(id);
  }

  @ApiBearerAuth('JWT-auth')
  @Post(':id/donation-needs')
  @ApiOperation({ summary: 'Add a donation need to a DRAFT event' })
  @ApiResponse({ status: 201, description: 'Donation need added' })
  @ApiResponse({
    status: 400,
    description: 'Invalid data or event not in DRAFT status',
  })
  @ApiResponse({
    status: 403,
    description: 'Caller is not an organizer of the organization',
  })
  @ApiResponse({ status: 404, description: 'Event not found' })
  addDonationNeed(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: DonationNeedInputDto,
  ) {
    return this.service.addDonationNeed(actor, id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id/donation-needs/:needId')
  @ApiOperation({
    summary: 'EVT-SUB: Update a donation need of an event',
  })
  @ApiResponse({ status: 200, description: 'Donation need updated' })
  @ApiResponse({ status: 400, description: 'Invalid data or state' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Donation need or event not found' })
  updateDonationNeed(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Param('needId') needId: string,
    @Body() dto: UpdateDonationNeedDto,
  ) {
    return this.service.updateDonationNeed(actor, needId, dto, id);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id/donation-needs/:needId')
  @ApiOperation({ summary: 'Remove a donation need from a DRAFT event' })
  @ApiResponse({ status: 200, description: 'Donation need removed' })
  @ApiResponse({
    status: 400,
    description: 'Event not in DRAFT status or has existing donations',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Donation need or event not found' })
  removeDonationNeed(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Param('needId') needId: string,
  ) {
    return this.service.removeDonationNeed(actor, id, needId);
  }

  @Public()
  @Get(':id/volunteer-roles')
  @ApiOperation({
    summary: 'EVT-SUB: Public discovery: get volunteer roles for an event',
  })
  @ApiResponse({ status: 200, description: 'List of volunteer roles' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  getVolunteerRoles(@Param('id') id: string) {
    return this.service.getVolunteerRoles(id);
  }

  @ApiBearerAuth('JWT-auth')
  @Post(':id/volunteer-roles')
  @ApiOperation({
    summary: 'EVT-SUB: Add a volunteer role to an event',
  })
  @ApiResponse({ status: 201, description: 'Volunteer role added' })
  @ApiResponse({ status: 400, description: 'Duplicate name or invalid state' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Event not found' })
  addVolunteerRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: VolunteerRoleInputDto,
  ) {
    return this.service.addVolunteerRole(actor, id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id/volunteer-roles/:roleId')
  @ApiOperation({
    summary: 'EVT-SUB: Update a volunteer role of an event',
  })
  @ApiResponse({ status: 200, description: 'Volunteer role updated' })
  @ApiResponse({ status: 400, description: 'Invalid data or duplicate name' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Volunteer role or event not found' })
  updateVolunteerRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
    @Body() dto: UpdateVolunteerRoleDto,
  ) {
    return this.service.updateVolunteerRole(actor, roleId, dto, id);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id/volunteer-roles/:roleId')
  @ApiOperation({
    summary: 'EVT-SUB: Remove a volunteer role from an event',
  })
  @ApiResponse({ status: 200, description: 'Volunteer role removed' })
  @ApiResponse({
    status: 400,
    description: 'Volunteer role has existing applications',
  })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Volunteer role or event not found' })
  removeVolunteerRole(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Param('roleId') roleId: string,
  ) {
    return this.service.removeVolunteerRole(actor, roleId, id);
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
