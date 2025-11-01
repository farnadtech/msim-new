-- Complete Phone Number & OTP Authentication Setup
-- Run this entire script in Supabase SQL Editor

-- ============================================================================
-- STEP 1: Add phone_number column to users table
-- ============================================================================

ALTER TABLE users 
ADD COLUMN IF NOT EXISTS phone_number VARCHAR(11);

-- ============================================================================
-- STEP 2: Create unique index for phone_number
-- ============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_unique 
ON users(phone_number) WHERE phone_number IS NOT NULL AND phone_number != '';

-- ============================================================================
-- STEP 3: Update existing users with default phone number
-- ============================================================================

UPDATE users 
SET phone_number = '09356963201' 
WHERE phone_number IS NULL OR phone_number = '';

-- ============================================================================
-- STEP 4: Create OTP verifications table
-- ============================================================================

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

-- ============================================================================
-- STEP 5: Add constraints to OTP table
-- ============================================================================

ALTER TABLE otp_verifications
ADD CONSTRAINT valid_purpose 
CHECK (purpose IN ('login', 'signup', 'activation'));

ALTER TABLE otp_verifications
ADD CONSTRAINT valid_phone_format 
CHECK (phone_number ~ '^09[0-9]{9}$');

ALTER TABLE otp_verifications
ADD CONSTRAINT valid_otp_code 
CHECK (otp_code ~ '^[0-9]{6}$');

-- ============================================================================
-- STEP 6: Create indexes for OTP table
-- ============================================================================

CREATE INDEX IF NOT EXISTS otp_phone_idx ON otp_verifications(phone_number);
CREATE INDEX IF NOT EXISTS otp_expires_idx ON otp_verifications(expires_at);
CREATE INDEX IF NOT EXISTS otp_purpose_idx ON otp_verifications(purpose);
CREATE INDEX IF NOT EXISTS otp_verified_idx ON otp_verifications(is_verified);
CREATE INDEX IF NOT EXISTS otp_phone_purpose_verified_idx 
ON otp_verifications(phone_number, purpose, is_verified);

-- ============================================================================
-- STEP 7: Enable RLS on OTP table
-- ============================================================================

ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- STEP 8: Create RLS policies for OTP table
-- ============================================================================

-- Allow anyone (anon + authenticated) to insert OTP records
CREATE POLICY otp_allow_insert 
ON otp_verifications 
FOR INSERT 
TO anon, authenticated 
WITH CHECK (true);

-- Allow authenticated users to read OTP records for their phone
CREATE POLICY otp_allow_select 
ON otp_verifications 
FOR SELECT 
TO authenticated 
USING (
    phone_number IN (
        SELECT phone_number FROM users WHERE id = auth.uid()
    )
);

-- Allow system updates to OTP records
CREATE POLICY otp_allow_update 
ON otp_verifications 
FOR UPDATE 
TO authenticated 
USING (true);

-- ============================================================================
-- STEP 9: Create helper functions
-- ============================================================================

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

-- ============================================================================
-- STEP 10: Add comments
-- ============================================================================

COMMENT ON COLUMN users.phone_number IS 'User phone number in Iranian format (09xxxxxxxxx)';
COMMENT ON TABLE otp_verifications IS 'Stores OTP codes for phone verification during login/signup/line activation';
COMMENT ON COLUMN otp_verifications.purpose IS 'Purpose of OTP: login, signup, or activation';
COMMENT ON COLUMN otp_verifications.is_verified IS 'Whether the OTP code has been verified';
COMMENT ON COLUMN otp_verifications.expires_at IS 'When the OTP code expires (default 5 minutes after creation)';
COMMENT ON FUNCTION delete_expired_otps() IS 'Removes expired OTP records from the database';
COMMENT ON FUNCTION increment_otp_attempts(INTEGER) IS 'Increments failed attempt counter for an OTP record';

-- ============================================================================
-- STEP 11: Cleanup expired OTPs
-- ============================================================================

SELECT delete_expired_otps() as deleted_otps;

-- ============================================================================
-- STEP 12: Verification queries
-- ============================================================================

-- Show users with phone numbers
SELECT 
    COUNT(*) as total_users,
    COUNT(phone_number) as users_with_phone,
    COUNT(CASE WHEN phone_number = '09356963201' THEN 1 END) as users_with_default_phone
FROM users;

-- Show OTP table structure
SELECT 
    column_name,
    data_type,
    is_nullable
FROM information_schema.columns
WHERE table_name = 'otp_verifications'
ORDER BY ordinal_position;

-- Show OTP table status
SELECT 
    (SELECT COUNT(*) FROM otp_verifications) as total_otp_records,
    (SELECT COUNT(*) FROM otp_verifications WHERE is_verified = true) as verified_otps,
    (SELECT COUNT(*) FROM otp_verifications WHERE expires_at < NOW()) as expired_otps;
