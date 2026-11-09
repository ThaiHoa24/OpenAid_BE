import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { DonationsService } from './donations.service.js';
import { CreateDonationDto, ReceiveDonationDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Donations')
@ApiBearerAuth('JWT-auth')
@Controller('donations')
export class DonationsController {
  constructor(private readonly service: DonationsService) {}

  @Post()
  @ApiOperation({ summary: 'Register an in-kind donation pledge and get a Tracking ID' })
  @ApiResponse({ status: 201, description: 'Donation created with unique tracking ID' })
  @ApiResponse({ status: 400, description: 'Invalid donation need or event not accepting donations' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  create(@CurrentUser('id') donorId: string, @Body() dto: CreateDonationDto) {
    return this.service.createDonation(donorId, dto);
  }

  @Get('my')
  @ApiOperation({ summary: 'Get current user donations (My Donations)' })
  @ApiResponse({ status: 200, description: 'List of donations created by the authenticated user' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  getMyDonations(
    @CurrentUser('id') donorId: string,
    @Query() query: PaginationDto,
  ) {
    return this.service.getMyDonations(donorId, query);
  }

  @Patch(':id/receipt')
  @ApiOperation({ summary: 'Confirm receipt of donation into inventory (Approve / Reject)' })
  @ApiResponse({
    status: 200,
    description: 'Donation receipt confirmed (RECEIVED) and inventory updated, or REJECTED',
  })
  @ApiResponse({ status: 400, description: 'Invalid donation status or missing rejection reason' })
  @ApiResponse({ status: 403, description: 'Caller is not an organizer of the event organization' })
  @ApiResponse({ status: 404, description: 'Donation not found' })
  receive(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReceiveDonationDto,
  ) {
    return this.service.receiveDonation(actor, id, dto);
  }

  @Get('event/:eventId')
  @ApiOperation({ summary: 'Get donations for an event (Organizer only)' })
  @ApiResponse({ status: 501, description: 'Scaffold: Pending implementation' })
  getByEvent(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Query() query: PaginationDto,
  ) {
    return this.service.getEventDonations(actor, eventId, query);
  }

  @Post(':id/cancel')
  @ApiOperation({ summary: 'Cancel own pending donation' })
  @ApiResponse({ status: 501, description: 'Scaffold: Pending implementation' })
  cancel(@CurrentUser('id') donorId: string, @Param('id') id: string) {
    return this.service.cancelDonation(donorId, id);
  }
}
