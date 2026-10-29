-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "SystemRole" AS ENUM ('USER', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrganizationRole" AS ENUM ('MEMBER', 'ORGANIZER');

-- CreateEnum
CREATE TYPE "OrgStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "EventStatus" AS ENUM ('DRAFT', 'PUBLISHED', 'CLOSED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "VolunteerApplicationStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "DonationStatus" AS ENUM ('PENDING', 'RECEIVED', 'REJECTED', 'IN_BATCH', 'DISTRIBUTED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "BatchStatus" AS ENUM ('DRAFT', 'READY', 'ASSIGNED', 'DISTRIBUTED');

-- CreateEnum
CREATE TYPE "TripStatus" AS ENUM ('SCHEDULED', 'PREPARING', 'IN_TRANSIT', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TripVolunteerRole" AS ENUM ('MEMBER', 'LEADER');

-- CreateEnum
CREATE TYPE "DistributionPointStatus" AS ENUM ('PENDING', 'ARRIVED', 'DISTRIBUTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "EvidenceReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransparencyEntityType" AS ENUM ('USER', 'ORGANIZATION', 'EVENT', 'VOLUNTEER_APPLICATION', 'DONATION', 'INVENTORY', 'BATCH', 'TRIP', 'DISTRIBUTION_POINT', 'DISTRIBUTION_RECORD', 'EVIDENCE');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" VARCHAR(150) NOT NULL,
    "phoneNumber" VARCHAR(25),
    "avatarUrl" TEXT,
    "systemRole" "SystemRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "createdById" UUID NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "code" VARCHAR(50) NOT NULL,
    "description" TEXT,
    "email" VARCHAR(255) NOT NULL,
    "phoneNumber" VARCHAR(25),
    "address" TEXT,
    "status" "OrgStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ(6),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "organizationId" UUID NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "organizationId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "contactName" VARCHAR(150) NOT NULL,
    "contactPhone" VARCHAR(25),
    "startDate" TIMESTAMPTZ(6) NOT NULL,
    "endDate" TIMESTAMPTZ(6),
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_roles" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventId" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_applications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "volunteerRoleId" UUID NOT NULL,
    "status" "VolunteerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ(6),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "volunteer_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_attendance" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "applicationId" UUID NOT NULL,
    "checkedInAt" TIMESTAMPTZ(6) NOT NULL,
    "checkedOutAt" TIMESTAMPTZ(6),
    "checkedInById" UUID,
    "checkedOutById" UUID,
    "method" VARCHAR(10) NOT NULL DEFAULT 'MANUAL',

    CONSTRAINT "volunteer_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_types" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(50) NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "category" VARCHAR(80) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "item_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" VARCHAR(30) NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_needs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventId" UUID NOT NULL,
    "itemTypeId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "targetQuantity" DECIMAL(14,3) NOT NULL,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donation_needs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "trackingId" VARCHAR(64) NOT NULL,
    "eventId" UUID NOT NULL,
    "donationNeedId" UUID NOT NULL,
    "itemTypeId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "donorId" UUID NOT NULL,
    "batchId" UUID,
    "quantity" DECIMAL(14,3) NOT NULL,
    "receivedQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "photoUrl" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "receivedById" UUID,
    "receivedAt" TIMESTAMPTZ(6),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventories" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventId" UUID NOT NULL,
    "itemTypeId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "receivedQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "availableQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reservedQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "distributedQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "lostQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "batchCode" VARCHAR(60) NOT NULL,
    "eventId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "inventoryId" UUID NOT NULL,
    "itemTypeId" UUID NOT NULL,
    "unitId" UUID NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "returnedQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "lostQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reconciliationNote" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripCode" VARCHAR(60) NOT NULL,
    "eventId" UUID NOT NULL,
    "createdById" UUID NOT NULL,
    "departurePoint" TEXT NOT NULL,
    "departureDate" TIMESTAMPTZ(6) NOT NULL,
    "vehicle" VARCHAR(150),
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" TIMESTAMPTZ(6),
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_volunteers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "applicationId" UUID NOT NULL,
    "role" "TripVolunteerRole" NOT NULL DEFAULT 'MEMBER',
    "assignedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "batchId" UUID NOT NULL,
    "eventId" UUID NOT NULL,
    "assignedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMPTZ(6),

    CONSTRAINT "trip_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_points" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "position" INTEGER NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "location" TEXT NOT NULL,
    "mapUrl" TEXT,
    "status" "DistributionPointStatus" NOT NULL DEFAULT 'PENDING',
    "arrivedAt" TIMESTAMPTZ(6),
    "distributedAt" TIMESTAMPTZ(6),
    "skippedReason" TEXT,

    CONSTRAINT "distribution_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_records" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "tripBatchId" UUID NOT NULL,
    "distributionPointId" UUID NOT NULL,
    "distributedQuantity" DECIMAL(14,3) NOT NULL,
    "beneficiaryCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "confirmedById" UUID NOT NULL,
    "confirmedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distribution_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tripId" UUID NOT NULL,
    "distributionPointId" UUID NOT NULL,
    "distributionRecordId" UUID,
    "uploadedById" UUID NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "mimeType" VARCHAR(50) NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "caption" TEXT,
    "privacyConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" "EvidenceReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" UUID,
    "reviewedAt" TIMESTAMPTZ(6),
    "reviewNote" TEXT,
    "uploadedAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transparency_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "eventId" UUID,
    "action" VARCHAR(80) NOT NULL,
    "entityType" "TransparencyEntityType" NOT NULL,
    "entityId" UUID NOT NULL,
    "actorId" UUID NOT NULL,
    "oldStatus" VARCHAR(40),
    "newStatus" VARCHAR(40),
    "evidenceId" UUID,
    "details" JSONB NOT NULL DEFAULT '{}',
    "isPublic" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transparency_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE INDEX "idx_organizations_status" ON "organizations"("status");

-- CreateIndex
CREATE INDEX "idx_org_members_org_role" ON "organization_members"("organizationId", "role");

-- CreateIndex
CREATE INDEX "idx_org_members_user" ON "organization_members"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_organization_member" ON "organization_members"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "idx_events_org_status" ON "events"("organizationId", "status");

-- CreateIndex
CREATE INDEX "idx_events_status_start" ON "events"("status", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "uq_volunteer_roles_event_name" ON "volunteer_roles"("eventId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "uq_volunteer_roles_id_event" ON "volunteer_roles"("id", "eventId");

-- CreateIndex
CREATE INDEX "idx_applications_role_status" ON "volunteer_applications"("volunteerRoleId", "status");

-- CreateIndex
CREATE INDEX "idx_applications_user_status" ON "volunteer_applications"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_application_event_user" ON "volunteer_applications"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_application_id_event" ON "volunteer_applications"("id", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_attendance_applicationId_key" ON "volunteer_attendance"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "item_types_code_key" ON "item_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "units_code_key" ON "units"("code");

-- CreateIndex
CREATE UNIQUE INDEX "uq_donation_needs_composite" ON "donation_needs"("id", "eventId", "itemTypeId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_donation_needs_event_item_unit" ON "donation_needs"("eventId", "itemTypeId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "donations_trackingId_key" ON "donations"("trackingId");

-- CreateIndex
CREATE INDEX "idx_donations_batch" ON "donations"("batchId");

-- CreateIndex
CREATE INDEX "idx_donations_donor_created" ON "donations"("donorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_donations_event_status" ON "donations"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_inventory_composite" ON "inventories"("id", "eventId", "itemTypeId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_inventory_event_item_unit" ON "inventories"("eventId", "itemTypeId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batchCode_key" ON "batches"("batchCode");

-- CreateIndex
CREATE INDEX "idx_batches_event_status" ON "batches"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_batch_composite" ON "batches"("id", "eventId", "itemTypeId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_batch_id_event" ON "batches"("id", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "trips_tripCode_key" ON "trips"("tripCode");

-- CreateIndex
CREATE INDEX "idx_trips_event_status" ON "trips"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "uq_trips_id_event" ON "trips"("id", "eventId");

-- CreateIndex
CREATE INDEX "idx_trip_volunteers_trip" ON "trip_volunteers"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_trip_volunteer_application" ON "trip_volunteers"("tripId", "applicationId");

-- CreateIndex
CREATE INDEX "idx_trip_batches_trip" ON "trip_batches"("tripId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_trip_batch_id_trip" ON "trip_batches"("id", "tripId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_trip_batch_pair" ON "trip_batches"("tripId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_distribution_point_id_trip" ON "distribution_points"("id", "tripId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_distribution_point_position" ON "distribution_points"("tripId", "position");

-- CreateIndex
CREATE INDEX "idx_distribution_records_point" ON "distribution_records"("distributionPointId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_distribution_batch_point" ON "distribution_records"("tripBatchId", "distributionPointId");

-- CreateIndex
CREATE UNIQUE INDEX "uq_distribution_record_composite" ON "distribution_records"("id", "tripId", "distributionPointId");

-- CreateIndex
CREATE INDEX "idx_evidence_trip_review" ON "evidence"("tripId", "reviewStatus");

-- CreateIndex
CREATE INDEX "idx_transparency_actor_timeline" ON "transparency_logs"("actorId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_transparency_entity_timeline" ON "transparency_logs"("entityType", "entityId", "createdAt" DESC);

-- CreateIndex
CREATE INDEX "idx_transparency_event_timeline" ON "transparency_logs"("eventId", "createdAt" DESC);

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organizations" ADD CONSTRAINT "organizations_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "volunteer_roles" ADD CONSTRAINT "volunteer_roles_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "volunteer_applications" ADD CONSTRAINT "fk_application_role_event" FOREIGN KEY ("volunteerRoleId", "eventId") REFERENCES "volunteer_roles"("id", "eventId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "volunteer_applications" ADD CONSTRAINT "volunteer_applications_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "volunteer_applications" ADD CONSTRAINT "volunteer_applications_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "volunteer_applications" ADD CONSTRAINT "volunteer_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "volunteer_attendance" ADD CONSTRAINT "volunteer_attendance_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "volunteer_applications"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "volunteer_attendance" ADD CONSTRAINT "volunteer_attendance_checkedInById_fkey" FOREIGN KEY ("checkedInById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "volunteer_attendance" ADD CONSTRAINT "volunteer_attendance_checkedOutById_fkey" FOREIGN KEY ("checkedOutById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "donation_needs" ADD CONSTRAINT "donation_needs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "donation_needs" ADD CONSTRAINT "donation_needs_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "item_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "donation_needs" ADD CONSTRAINT "donation_needs_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "item_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "fk_donation_batch" FOREIGN KEY ("batchId", "eventId", "itemTypeId", "unitId") REFERENCES "batches"("id", "eventId", "itemTypeId", "unitId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "fk_donation_need" FOREIGN KEY ("donationNeedId", "eventId", "itemTypeId", "unitId") REFERENCES "donation_needs"("id", "eventId", "itemTypeId", "unitId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "item_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "item_types"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "fk_batch_inventory" FOREIGN KEY ("inventoryId", "eventId", "itemTypeId", "unitId") REFERENCES "inventories"("id", "eventId", "itemTypeId", "unitId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trip_volunteers" ADD CONSTRAINT "fk_trip_volunteers_application" FOREIGN KEY ("applicationId", "eventId") REFERENCES "volunteer_applications"("id", "eventId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trip_volunteers" ADD CONSTRAINT "fk_trip_volunteers_trip" FOREIGN KEY ("tripId", "eventId") REFERENCES "trips"("id", "eventId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trip_batches" ADD CONSTRAINT "fk_trip_batches_batch" FOREIGN KEY ("batchId", "eventId") REFERENCES "batches"("id", "eventId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "trip_batches" ADD CONSTRAINT "fk_trip_batches_trip" FOREIGN KEY ("tripId", "eventId") REFERENCES "trips"("id", "eventId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "distribution_points" ADD CONSTRAINT "distribution_points_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "distribution_records" ADD CONSTRAINT "distribution_records_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "distribution_records" ADD CONSTRAINT "fk_distribution_record_batch" FOREIGN KEY ("tripBatchId", "tripId") REFERENCES "trip_batches"("id", "tripId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "distribution_records" ADD CONSTRAINT "fk_distribution_record_point" FOREIGN KEY ("distributionPointId", "tripId") REFERENCES "distribution_points"("id", "tripId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "distribution_records" ADD CONSTRAINT "fk_distribution_record_trip" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "fk_evidence_point" FOREIGN KEY ("distributionPointId", "tripId") REFERENCES "distribution_points"("id", "tripId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "fk_evidence_record" FOREIGN KEY ("distributionRecordId", "tripId", "distributionPointId") REFERENCES "distribution_records"("id", "tripId", "distributionPointId") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transparency_logs" ADD CONSTRAINT "transparency_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transparency_logs" ADD CONSTRAINT "transparency_logs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "transparency_logs" ADD CONSTRAINT "transparency_logs_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidence"("id") ON DELETE NO ACTION ON UPDATE NO ACTION;

