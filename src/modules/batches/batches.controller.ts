import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiResponse, ApiTags } from '@nestjs/swagger';
import { BatchesService } from './batches.service.js';
import {
  CreateBatchDto,
  ReconcileBatchDto,
  UpdateBatchDto,
} from './dto/index.js';
import { CurrentUser } from '../../common/decorators/index.js';
import type { AuthenticatedUser } from '../../common/types/authenticated-user.js';

@ApiTags('Batches')
@ApiBearerAuth('JWT-auth')
@ApiResponse({
  status: 501,
  description: 'Scaffold: Batch use cases are pending.',
})
@Controller('batches')
export class BatchesController {
  constructor(private readonly service: BatchesService) {}

  @Post()
  create(@CurrentUser() actor: AuthenticatedUser, @Body() dto: CreateBatchDto) {
    return this.service.createBatch(actor, dto);
  }

  @Get('event/:eventId')
  getByEvent(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('eventId') eventId: string,
  ) {
    return this.service.getBatchesByEvent(actor, eventId);
  }

  @Get(':id')
  getById(@CurrentUser() actor: AuthenticatedUser, @Param('id') id: string) {
    return this.service.getBatchById(actor, id);
  }

  @Patch(':id/status')
  update(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: UpdateBatchDto,
  ) {
    return this.service.updateBatch(actor, id, dto);
  }

  @Post(':id/reconcile')
  reconcile(
    @CurrentUser() actor: AuthenticatedUser,
    @Param('id') id: string,
    @Body() dto: ReconcileBatchDto,
  ) {
    return this.service.reconcileBatch(actor, id, dto);
  }
}
