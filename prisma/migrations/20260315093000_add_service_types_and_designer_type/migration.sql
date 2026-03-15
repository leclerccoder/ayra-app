-- Add designer type metadata to users and invites
ALTER TABLE "AdminInvite" ADD COLUMN IF NOT EXISTS "designerType" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "designerType" TEXT;

-- Create service type catalogue for enquiry form options
CREATE TABLE IF NOT EXISTS "ServiceType" (
  "id" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT "ServiceType_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "ServiceType_name_key" ON "ServiceType"("name");

-- Seed default service types for the enquiry wizard
INSERT INTO "ServiceType" ("id", "name", "createdAt", "updatedAt")
VALUES
  ('service_type_2d_design', '2D Design', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('service_type_3d_design', '3D Design', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('service_type_renovation', 'Renovation', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
  ('service_type_design_build', 'Design & Build', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
ON CONFLICT ("name") DO NOTHING;
