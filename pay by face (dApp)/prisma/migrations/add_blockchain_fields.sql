-- AddBlockchainFields migration
-- Adds ethAddress + encryptedPrivateKey to User
-- Adds txHash + chainId to Transaction

ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "ethAddress" TEXT;
ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "encryptedPrivateKey" TEXT;

-- Unique constraint on ethAddress (only if column doesn't already have it)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'User_ethAddress_key'
  ) THEN
    ALTER TABLE "User" ADD CONSTRAINT "User_ethAddress_key" UNIQUE ("ethAddress");
  END IF;
END $$;

ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "txHash" TEXT;
ALTER TABLE "Transaction" ADD COLUMN IF NOT EXISTS "chainId" INTEGER;
