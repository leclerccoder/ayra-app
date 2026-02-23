-- Add wallet columns for users
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "walletAddress" TEXT,
  ADD COLUMN IF NOT EXISTS "walletPrivateKey" TEXT;

-- Ensure walletAddress is unique when present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE indexname = 'User_walletAddress_key'
  ) THEN
    CREATE UNIQUE INDEX "User_walletAddress_key" ON "User"("walletAddress");
  END IF;
END $$;
