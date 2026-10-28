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
CREATE TYPE "TripVolunteerRole" AS ENUM ('LEADER', 'MEMBER');

-- CreateEnum
CREATE TYPE "DistributionPointStatus" AS ENUM ('PENDING', 'ARRIVED', 'DISTRIBUTED', 'SKIPPED');

-- CreateEnum
CREATE TYPE "EvidenceReviewStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "TransparencyEntityType" AS ENUM ('ORGANIZATION', 'EVENT', 'VOLUNTEER_APPLICATION', 'DONATION', 'INVENTORY', 'BATCH', 'TRIP', 'DISTRIBUTION_POINT', 'DISTRIBUTION_RECORD', 'EVIDENCE');

-- CreateTable
CREATE TABLE "users" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "fullName" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "avatarUrl" TEXT,
    "systemRole" "SystemRole" NOT NULL DEFAULT 'USER',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organizations" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "description" TEXT,
    "email" TEXT NOT NULL,
    "phoneNumber" TEXT,
    "address" TEXT,
    "status" "OrgStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "organizations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "organization_members" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "role" "OrganizationRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "organization_members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "location" TEXT NOT NULL,
    "contactName" TEXT NOT NULL,
    "contactPhone" TEXT,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3),
    "status" "EventStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_roles" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "quantity" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteer_roles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_applications" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "volunteerRoleId" TEXT NOT NULL,
    "status" "VolunteerApplicationStatus" NOT NULL DEFAULT 'PENDING',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "volunteer_applications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "volunteer_attendance" (
    "id" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "checkedInAt" TIMESTAMP(3) NOT NULL,
    "checkedOutAt" TIMESTAMP(3),

    CONSTRAINT "volunteer_attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "item_types" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,

    CONSTRAINT "item_types_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "units" (
    "id" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donation_needs" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "targetQuantity" DECIMAL(14,3) NOT NULL,
    "notes" TEXT,

    CONSTRAINT "donation_needs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "donations" (
    "id" TEXT NOT NULL,
    "trackingId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "donationNeedId" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "donorId" TEXT NOT NULL,
    "batchId" TEXT,
    "quantity" DECIMAL(14,3) NOT NULL,
    "photoUrl" TEXT,
    "status" "DonationStatus" NOT NULL DEFAULT 'PENDING',
    "receivedAt" TIMESTAMP(3),
    "rejectionReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "donations_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventories" (
    "id" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "receivedQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "availableQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reservedQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "distributedQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "lostQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inventories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "batches" (
    "id" TEXT NOT NULL,
    "batchCode" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "inventoryId" TEXT NOT NULL,
    "itemTypeId" TEXT NOT NULL,
    "unitId" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "returnedQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "lostQuantity" DECIMAL(14,3) NOT NULL DEFAULT 0,
    "reconciliationNote" TEXT,
    "status" "BatchStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trips" (
    "id" TEXT NOT NULL,
    "tripCode" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "departurePoint" TEXT NOT NULL,
    "departureDate" TIMESTAMP(3) NOT NULL,
    "vehicle" TEXT,
    "status" "TripStatus" NOT NULL DEFAULT 'SCHEDULED',
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "trips_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_volunteers" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "applicationId" TEXT NOT NULL,
    "role" "TripVolunteerRole" NOT NULL DEFAULT 'MEMBER',
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "trip_volunteers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "trip_batches" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "batchId" TEXT NOT NULL,
    "eventId" TEXT NOT NULL,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "unassignedAt" TIMESTAMP(3),

    CONSTRAINT "trip_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_points" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "position" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "mapUrl" TEXT,
    "status" "DistributionPointStatus" NOT NULL DEFAULT 'PENDING',
    "arrivedAt" TIMESTAMP(3),
    "distributedAt" TIMESTAMP(3),
    "skippedReason" TEXT,

    CONSTRAINT "distribution_points_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "distribution_records" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "tripBatchId" TEXT NOT NULL,
    "distributionPointId" TEXT NOT NULL,
    "distributedQuantity" DECIMAL(14,3) NOT NULL,
    "beneficiaryCount" INTEGER NOT NULL DEFAULT 0,
    "notes" TEXT,
    "confirmedById" TEXT NOT NULL,
    "confirmedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "distribution_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "evidence" (
    "id" TEXT NOT NULL,
    "tripId" TEXT NOT NULL,
    "distributionPointId" TEXT NOT NULL,
    "distributionRecordId" TEXT,
    "uploadedById" TEXT NOT NULL,
    "imageUrl" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "caption" TEXT,
    "privacyConfirmed" BOOLEAN NOT NULL DEFAULT false,
    "reviewStatus" "EvidenceReviewStatus" NOT NULL DEFAULT 'PENDING',
    "reviewedById" TEXT,
    "reviewedAt" TIMESTAMP(3),
    "reviewNote" TEXT,
    "uploadedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "evidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "transparency_logs" (
    "id" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "entityType" "TransparencyEntityType" NOT NULL,
    "entityId" TEXT NOT NULL,
    "actorId" TEXT NOT NULL,
    "oldStatus" TEXT,
    "newStatus" TEXT,
    "evidenceId" TEXT,
    "details" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "transparency_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

-- CreateIndex
CREATE UNIQUE INDEX "organizations_code_key" ON "organizations"("code");

-- CreateIndex
CREATE INDEX "organization_members_organizationId_role_idx" ON "organization_members"("organizationId", "role");

-- CreateIndex
CREATE UNIQUE INDEX "organization_members_userId_organizationId_key" ON "organization_members"("userId", "organizationId");

-- CreateIndex
CREATE INDEX "events_organizationId_status_idx" ON "events"("organizationId", "status");

-- CreateIndex
CREATE INDEX "events_status_startDate_idx" ON "events"("status", "startDate");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_roles_id_eventId_key" ON "volunteer_roles"("id", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_roles_eventId_name_key" ON "volunteer_roles"("eventId", "name");

-- CreateIndex
CREATE INDEX "volunteer_applications_userId_status_idx" ON "volunteer_applications"("userId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_applications_eventId_userId_key" ON "volunteer_applications"("eventId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_applications_id_eventId_key" ON "volunteer_applications"("id", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "volunteer_attendance_applicationId_key" ON "volunteer_attendance"("applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "item_types_code_key" ON "item_types"("code");

-- CreateIndex
CREATE UNIQUE INDEX "units_code_key" ON "units"("code");

-- CreateIndex
CREATE UNIQUE INDEX "donation_needs_eventId_itemTypeId_unitId_key" ON "donation_needs"("eventId", "itemTypeId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "donation_needs_id_eventId_itemTypeId_unitId_key" ON "donation_needs"("id", "eventId", "itemTypeId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "donations_trackingId_key" ON "donations"("trackingId");

-- CreateIndex
CREATE INDEX "donations_donorId_createdAt_idx" ON "donations"("donorId", "createdAt");

-- CreateIndex
CREATE INDEX "donations_eventId_status_idx" ON "donations"("eventId", "status");

-- CreateIndex
CREATE INDEX "donations_batchId_idx" ON "donations"("batchId");

-- CreateIndex
CREATE UNIQUE INDEX "inventories_eventId_itemTypeId_unitId_key" ON "inventories"("eventId", "itemTypeId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "inventories_id_eventId_itemTypeId_unitId_key" ON "inventories"("id", "eventId", "itemTypeId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "batches_batchCode_key" ON "batches"("batchCode");

-- CreateIndex
CREATE INDEX "batches_eventId_status_idx" ON "batches"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "batches_id_eventId_key" ON "batches"("id", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "batches_id_eventId_itemTypeId_unitId_key" ON "batches"("id", "eventId", "itemTypeId", "unitId");

-- CreateIndex
CREATE UNIQUE INDEX "trips_tripCode_key" ON "trips"("tripCode");

-- CreateIndex
CREATE INDEX "trips_eventId_status_idx" ON "trips"("eventId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "trips_id_eventId_key" ON "trips"("id", "eventId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_volunteers_tripId_applicationId_key" ON "trip_volunteers"("tripId", "applicationId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_batches_tripId_batchId_key" ON "trip_batches"("tripId", "batchId");

-- CreateIndex
CREATE UNIQUE INDEX "trip_batches_id_tripId_key" ON "trip_batches"("id", "tripId");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_points_tripId_position_key" ON "distribution_points"("tripId", "position");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_points_id_tripId_key" ON "distribution_points"("id", "tripId");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_records_tripBatchId_distributionPointId_key" ON "distribution_records"("tripBatchId", "distributionPointId");

-- CreateIndex
CREATE UNIQUE INDEX "distribution_records_id_tripId_distributionPointId_key" ON "distribution_records"("id", "tripId", "distributionPointId");

-- CreateIndex
CREATE INDEX "evidence_tripId_reviewStatus_idx" ON "evidence"("tripId", "reviewStatus");

-- CreateIndex
CREATE INDEX "transparency_logs_entityType_entityId_createdAt_idx" ON "transparency_logs"("entityType", "entityId", "createdAt");

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "organization_members" ADD CONSTRAINT "organization_members_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "events" ADD CONSTRAINT "events_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organizations"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_roles" ADD CONSTRAINT "volunteer_roles_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_applications" ADD CONSTRAINT "volunteer_applications_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_applications" ADD CONSTRAINT "volunteer_applications_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_applications" ADD CONSTRAINT "volunteer_applications_volunteerRoleId_eventId_fkey" FOREIGN KEY ("volunteerRoleId", "eventId") REFERENCES "volunteer_roles"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "volunteer_attendance" ADD CONSTRAINT "volunteer_attendance_applicationId_fkey" FOREIGN KEY ("applicationId") REFERENCES "volunteer_applications"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_needs" ADD CONSTRAINT "donation_needs_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_needs" ADD CONSTRAINT "donation_needs_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "item_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donation_needs" ADD CONSTRAINT "donation_needs_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_donorId_fkey" FOREIGN KEY ("donorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_donationNeedId_eventId_itemTypeId_unitId_fkey" FOREIGN KEY ("donationNeedId", "eventId", "itemTypeId", "unitId") REFERENCES "donation_needs"("id", "eventId", "itemTypeId", "unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "donations" ADD CONSTRAINT "donations_batchId_eventId_itemTypeId_unitId_fkey" FOREIGN KEY ("batchId", "eventId", "itemTypeId", "unitId") REFERENCES "batches"("id", "eventId", "itemTypeId", "unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_itemTypeId_fkey" FOREIGN KEY ("itemTypeId") REFERENCES "item_types"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_unitId_fkey" FOREIGN KEY ("unitId") REFERENCES "units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "batches" ADD CONSTRAINT "batches_inventoryId_eventId_itemTypeId_unitId_fkey" FOREIGN KEY ("inventoryId", "eventId", "itemTypeId", "unitId") REFERENCES "inventories"("id", "eventId", "itemTypeId", "unitId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trips" ADD CONSTRAINT "trips_eventId_fkey" FOREIGN KEY ("eventId") REFERENCES "events"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_volunteers" ADD CONSTRAINT "trip_volunteers_tripId_eventId_fkey" FOREIGN KEY ("tripId", "eventId") REFERENCES "trips"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_volunteers" ADD CONSTRAINT "trip_volunteers_applicationId_eventId_fkey" FOREIGN KEY ("applicationId", "eventId") REFERENCES "volunteer_applications"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_batches" ADD CONSTRAINT "trip_batches_tripId_eventId_fkey" FOREIGN KEY ("tripId", "eventId") REFERENCES "trips"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "trip_batches" ADD CONSTRAINT "trip_batches_batchId_eventId_fkey" FOREIGN KEY ("batchId", "eventId") REFERENCES "batches"("id", "eventId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_points" ADD CONSTRAINT "distribution_points_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_records" ADD CONSTRAINT "distribution_records_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_records" ADD CONSTRAINT "distribution_records_tripBatchId_tripId_fkey" FOREIGN KEY ("tripBatchId", "tripId") REFERENCES "trip_batches"("id", "tripId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_records" ADD CONSTRAINT "distribution_records_distributionPointId_tripId_fkey" FOREIGN KEY ("distributionPointId", "tripId") REFERENCES "distribution_points"("id", "tripId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "distribution_records" ADD CONSTRAINT "distribution_records_confirmedById_fkey" FOREIGN KEY ("confirmedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_tripId_fkey" FOREIGN KEY ("tripId") REFERENCES "trips"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_distributionPointId_tripId_fkey" FOREIGN KEY ("distributionPointId", "tripId") REFERENCES "distribution_points"("id", "tripId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_distributionRecordId_tripId_distributionPointId_fkey" FOREIGN KEY ("distributionRecordId", "tripId", "distributionPointId") REFERENCES "distribution_records"("id", "tripId", "distributionPointId") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_uploadedById_fkey" FOREIGN KEY ("uploadedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_reviewedById_fkey" FOREIGN KEY ("reviewedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transparency_logs" ADD CONSTRAINT "transparency_logs_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "transparency_logs" ADD CONSTRAINT "transparency_logs_evidenceId_fkey" FOREIGN KEY ("evidenceId") REFERENCES "evidence"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Additional MVP constraints not expressible in the Prisma schema.
-- Workflow services must still enforce transitions, permissions and cross-row quantity limits.
ALTER TABLE "events" ADD CONSTRAINT "events_dates_check"
  CHECK ("endDate" IS NULL OR "endDate" >= "startDate");
ALTER TABLE "volunteer_roles" ADD CONSTRAINT "volunteer_roles_quantity_check"
  CHECK ("quantity" > 0);
ALTER TABLE "volunteer_attendance" ADD CONSTRAINT "attendance_dates_check"
  CHECK ("checkedOutAt" IS NULL OR "checkedOutAt" >= "checkedInAt");
ALTER TABLE "donation_needs" ADD CONSTRAINT "donation_needs_quantity_check"
  CHECK ("targetQuantity" > 0);
ALTER TABLE "donations" ADD CONSTRAINT "donations_quantity_check"
  CHECK ("quantity" > 0);
ALTER TABLE "inventories" ADD CONSTRAINT "inventories_quantities_check"
  CHECK (
    "receivedQuantity" >= 0 AND "availableQuantity" >= 0 AND
    "reservedQuantity" >= 0 AND "distributedQuantity" >= 0 AND "lostQuantity" >= 0 AND
    "receivedQuantity" = "availableQuantity" + "reservedQuantity" + "distributedQuantity" + "lostQuantity"
  );
ALTER TABLE "batches" ADD CONSTRAINT "batches_quantities_check"
  CHECK ("quantity" > 0 AND "returnedQuantity" >= 0 AND "lostQuantity" >= 0 AND
    "returnedQuantity" + "lostQuantity" <= "quantity");
ALTER TABLE "batches" ADD CONSTRAINT "batches_reconciliation_note_check"
  CHECK (("returnedQuantity" = 0 AND "lostQuantity" = 0) OR coalesce(length(trim("reconciliationNote")), 0) > 0);
ALTER TABLE "trip_batches" ADD CONSTRAINT "trip_batches_dates_check"
  CHECK ("unassignedAt" IS NULL OR "unassignedAt" >= "assignedAt");
CREATE UNIQUE INDEX "trip_batches_one_active_assignment"
  ON "trip_batches" ("batchId") WHERE "unassignedAt" IS NULL;
CREATE UNIQUE INDEX "trip_volunteers_one_leader"
  ON "trip_volunteers" ("tripId") WHERE "role" = 'LEADER';
ALTER TABLE "distribution_points" ADD CONSTRAINT "distribution_points_position_check"
  CHECK ("position" > 0);
ALTER TABLE "distribution_records" ADD CONSTRAINT "distribution_records_quantities_check"
  CHECK ("distributedQuantity" > 0 AND "beneficiaryCount" >= 0);
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_upload_check"
  CHECK ("sizeBytes" > 0 AND "sizeBytes" <= 5242880 AND "mimeType" IN ('image/jpeg', 'image/png', 'image/webp'));
ALTER TABLE "evidence" ADD CONSTRAINT "evidence_public_review_check"
  CHECK ("reviewStatus" <> 'APPROVED' OR
    ("privacyConfirmed" = true AND "reviewedById" IS NOT NULL AND "reviewedAt" IS NOT NULL));
