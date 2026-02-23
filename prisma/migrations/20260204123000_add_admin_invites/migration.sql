-- Create admin invite table
CREATE TABLE IF NOT EXISTS "AdminInvite" (
  "id" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "tokenHash" TEXT NOT NULL,
  "invitedById" TEXT NOT NULL,
  "acceptedUserId" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "acceptedAt" TIMESTAMP(3),

  CONSTRAINT "AdminInvite_pkey" PRIMARY KEY ("id")
);

-- Indexes
CREATE UNIQUE INDEX IF NOT EXISTS "AdminInvite_tokenHash_key" ON "AdminInvite"("tokenHash");
CREATE INDEX IF NOT EXISTS "AdminInvite_email_idx" ON "AdminInvite"("email");
CREATE INDEX IF NOT EXISTS "AdminInvite_invitedById_idx" ON "AdminInvite"("invitedById");
CREATE INDEX IF NOT EXISTS "AdminInvite_acceptedUserId_idx" ON "AdminInvite"("acceptedUserId");

-- Foreign keys
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AdminInvite_invitedById_fkey'
  ) THEN
    ALTER TABLE "AdminInvite"
      ADD CONSTRAINT "AdminInvite_invitedById_fkey"
      FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'AdminInvite_acceptedUserId_fkey'
  ) THEN
    ALTER TABLE "AdminInvite"
      ADD CONSTRAINT "AdminInvite_acceptedUserId_fkey"
      FOREIGN KEY ("acceptedUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
