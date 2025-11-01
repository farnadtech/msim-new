-- ============================================================================
-- COMPLETE Phone/OTP Setup - Run this ENTIRE script in Supabase SQL Editor
-- ============================================================================

-- Step 1: Add phone_number column to users table
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE users ADD COLUMN phone_number VARCHAR(11);
    END IF;
END $$;

-- Step 2: Drop old unique constraint if exists
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_phone_number_unique;

-- Step 3: Update all existing users with default phone number
UPDATE users 
SET phone_number = '09356963201' 
WHERE phone_number IS NULL OR phone_number = '';

-- Step 4: Create OTP verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(11) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL,
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    attempts INTEGER DEFAULT 0
);

-- Step 5: Add constraints
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_purpose'
    ) THEN
        ALTER TABLE otp_verifications
        ADD CONSTRAINT valid_purpose 
        CHECK (purpose IN ('login', 'signup', 'activation'));
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_phone_format'
    ) THEN
        ALTER TABLE otp_verifications
        ADD CONSTRAINT valid_phone_format 
        CHECK (phone_number ~ '^09[0-9]{9}$');
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'valid_otp_code'
    ) THEN
        ALTER TABLE otp_verifications
        ADD CONSTRAINT valid_otp_code 
        CHECK (otp_code ~ '^[0-9]{6}$');
    END IF;
END $$;

-- Step 6: Create indexes
CREATE INDEX IF NOT EXISTS otp_phone_idx ON otp_verifications(phone_number);
CREATE INDEX IF NOT EXISTS otp_expires_idx ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS otp_purpose_idx ON otp_verifications(purpose);
CREATE INDEX IF NOT EXISTS otp_verified_idx ON otp_verifications(is_verified);
CREATE INDEX IF NOT EXISTS otp_phone_purpose_verified_idx 
ON otp_verifications(phone_number, purpose, is_verified);

-- Step 7: Enable RLS
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Step 8: Drop old policies if they exist
DROP POLICY IF EXISTS otp_allow_insert ON otp_verifications;
DROP POLICY IF EXISTS otp_allow_select ON otp_verifications;
DROP POLICY IF EXISTS otp_allow_update ON otp_verifications;
DROP POLICY IF EXISTS otp_public_insert ON otp_verifications;
DROP POLICY IF EXISTS otp_public_select ON otp_verifications;
DROP POLICY IF EXISTS otp_public_update ON otp_verifications;

-- Step 9: Create RLS policies (PUBLIC ACCESS for OTP operations)
CREATE POLICY otp_public_insert 
ON otp_verifications 
FOR INSERT 
WITH CHECK (true);

CREATE POLICY otp_public_select 
ON otp_verifications 
FOR SELECT 
USING (true);

CREATE POLICY otp_public_update 
ON otp_verifications 
FOR UPDATE 
USING (true);

-- Step 10: Create helper functions
CREATE OR REPLACE FUNCTION delete_expired_otps()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM otp_verifications 
    WHERE expires_at < NOW();
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION increment_otp_attempts(p_id INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE otp_verifications 
    SET attempts = attempts + 1, 
        updated_at = NOW()
    WHERE id = p_id;
END;
$$ LANGUAGE plpgsql;

-- Step 11: Verify setup
SELECT 
    'Setup Complete!' as status,
    COUNT(*) as total_users,
    COUNT(phone_number) as users_with_phone
FROM users;

SELECT 
    'OTP Table Ready!' as status,
    COUNT(*) as otp_records
FROM otp_verifications;
