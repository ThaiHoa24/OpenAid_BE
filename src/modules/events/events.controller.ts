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
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
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
@ApiResponse({
  status: 501,
  description: 'Scaffold: Event use cases are pending.',
})
@Controller('events')
export class EventsController {
  constructor(private readonly service: EventsService) {}

  @Public()
  @Get()
  getAll(@Query() query: EventQueryDto) {
    return this.service.getAllEvents(query);
  }

  @Public()
  @Get(':id')
  getById(@Param('id') id: string) {
    return this.service.getEventById(id);
  }

  @ApiBearerAuth('JWT-auth')
  @Post()
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateEventDto) {
    return this.service.createEvent(actor, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id')
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.service.updateEvent(actor, id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Patch(':id/status')
  changeStatus(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ChangeEventStatusDto,
  ) {
    return this.service.changeStatus(actor, id, dto);
  }

  @ApiBearerAuth('JWT-auth')
  @Delete(':id')
  deleteDraft(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
  ) {
    return this.service.deleteDraft(actor, id);
  }
}
