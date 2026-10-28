import { Module } from '@nestjs/common';
import { TransparencyService } from './transparency.service.js';
import { TransparencyController } from './transparency.controller.js';
import { TransparencyRepository } from './transparency.repository.js';

@Module({
  controllers: [TransparencyController],
  providers: [TransparencyService, TransparencyRepository],
  exports: [TransparencyRepository],
})
export class TransparencyModule {}
