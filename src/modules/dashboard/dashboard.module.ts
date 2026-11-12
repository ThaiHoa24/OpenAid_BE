import { Module } from '@nestjs/common';
import { DashboardService } from './dashboard.service.js';
import {
  DashboardController,
  ReportsController,
} from './dashboard.controller.js';
import { OrganizationsModule } from '../organizations/organizations.module.js';

@Module({
  imports: [OrganizationsModule],
  controllers: [DashboardController, ReportsController],
  providers: [DashboardService],
  exports: [DashboardService],
})
export class DashboardModule {}
