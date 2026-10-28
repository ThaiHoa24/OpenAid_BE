import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import configuration from './config/configuration.js';
import { validate } from './config/env.validation.js';
import { PrismaModule } from './database/prisma.module.js';

import { AuthModule } from './modules/auth/auth.module.js';
import { UsersModule } from './modules/users/users.module.js';
import { OrganizationsModule } from './modules/organizations/organizations.module.js';
import { EventsModule } from './modules/events/events.module.js';
import { VolunteersModule } from './modules/volunteers/volunteers.module.js';
import { DonationsModule } from './modules/donations/donations.module.js';
import { InventoryModule } from './modules/inventory/inventory.module.js';
import { BatchesModule } from './modules/batches/batches.module.js';
import { TripsModule } from './modules/trips/trips.module.js';
import { DistributionModule } from './modules/distribution/distribution.module.js';
import { EvidenceModule } from './modules/evidence/evidence.module.js';
import { TransparencyModule } from './modules/transparency/transparency.module.js';
import { DashboardModule } from './modules/dashboard/dashboard.module.js';
import { AdminModule } from './modules/admin/admin.module.js';

import { HealthModule } from './modules/health/health.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
      validate,
    }),
    PrismaModule,
    HealthModule,
    AuthModule,
    UsersModule,
    OrganizationsModule,
    EventsModule,
    VolunteersModule,
    DonationsModule,
    InventoryModule,
    BatchesModule,
    TripsModule,
    DistributionModule,
    EvidenceModule,
    TransparencyModule,
    DashboardModule,
    AdminModule,
  ],
})
export class AppModule {}
