-- ============================================
-- MIGRATION: Add email and account_type to profiles
-- Run this in Supabase SQL Editor if you already have
-- the profiles table created
-- ============================================

-- Add email column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'email'
    ) THEN
        ALTER TABLE profiles ADD COLUMN email VARCHAR(255);
    END IF;
END $$;

-- Add account_type column if not exists
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'profiles' AND column_name = 'account_type'
    ) THEN
        ALTER TABLE profiles ADD COLUMN account_type VARCHAR(20) DEFAULT 'both' 
            CHECK (account_type IN ('forex', 'stock', 'both'));
    END IF;
END $$;

-- Backfill existing users with 'both' account type
UPDATE profiles SET account_type = 'both' WHERE account_type IS NULL;

-- Log success
SELECT 'Migration complete! email and account_type columns added.' as status;
