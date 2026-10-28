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
import { DonationsService } from './donations.service.js';
import { CreateDonationDto, ReceiveDonationDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import { PaginationDto } from '../../common/dto/pagination.dto.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Donations')
@ApiBearerAuth('JWT-auth')
@ApiResponse({
  status: 501,
  description:
    'Scaffold: Donation use cases are pending. Public tracking is under /transparency.',
})
@Controller('donations')
export class DonationsController {
  constructor(private readonly service: DonationsService) {}

  @Post()
  create(@CurrentUser('id') donorId: string, @Body() dto: CreateDonationDto) {
    return this.service.createDonation(donorId, dto);
  }

  @Get('my')
  getMyDonations(
    @CurrentUser('id') donorId: string,
    @Query() query: PaginationDto,
  ) {
    return this.service.getMyDonations(donorId, query);
  }

  @Get('event/:eventId')
  getByEvent(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId') eventId: string,
    @Query() query: PaginationDto,
  ) {
    return this.service.getEventDonations(actor, eventId, query);
  }

  @Patch(':id/receipt')
  receive(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReceiveDonationDto,
  ) {
    return this.service.receiveDonation(actor, id, dto);
  }

  @Post(':id/cancel')
  cancel(@CurrentUser('id') donorId: string, @Param('id') id: string) {
    return this.service.cancelDonation(donorId, id);
  }
}
