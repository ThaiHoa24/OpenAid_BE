import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { EvidenceService } from './evidence.service.js';
import { CreateEvidenceDto, ReviewEvidenceDto } from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Evidence')
@ApiBearerAuth('JWT-auth')
@ApiResponse({
  status: 501,
  description:
    'Scaffold: multipart upload, storage and Organizer review are pending.',
})
@Controller('evidence')
export class EvidenceController {
  constructor(private readonly service: EvidenceService) {}

  @Post()
  create(
    @CurrentUser() actor: AuthenticatedUser,
    @Body() dto: CreateEvidenceDto,
  ) {
    return this.service.createEvidence(actor, dto);
  }

  @Get('trip/:tripId')
  getByTrip(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('tripId') tripId: string,
  ) {
    return this.service.getEvidenceByTrip(actor, tripId);
  }

  @Patch(':id/review')
  review(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReviewEvidenceDto,
  ) {
    return this.service.reviewEvidence(actor, id, dto);
  }
}
