-- CreateEnum
CREATE TYPE "OtpType" AS ENUM ('REGISTER', 'FORGOT_PASSWORD');

-- CreateTable
CREATE TABLE "otp_verifications" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" VARCHAR(255) NOT NULL,
    "code" VARCHAR(10) NOT NULL,
    "type" "OtpType" NOT NULL,
    "expiresAt" TIMESTAMPTZ(6) NOT NULL,
    "isUsed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "otp_verifications_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "idx_otp_verifications_email_type" ON "otp_verifications"("email", "type");

