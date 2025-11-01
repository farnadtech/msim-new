-- Phone Number & OTP Authentication Migration
-- Run this in Supabase SQL Editor

-- Step 1: Add phone_number column to users table
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone_number'
    ) THEN
        ALTER TABLE users ADD COLUMN phone_number VARCHAR(11);
        RAISE NOTICE 'Added phone_number column to users table';
    ELSE
        RAISE NOTICE 'phone_number column already exists';
    END IF;
END $$;

-- Step 2: Add unique index on phone_number
CREATE UNIQUE INDEX IF NOT EXISTS users_phone_number_unique 
ON users(phone_number) WHERE phone_number IS NOT NULL AND phone_number != '';

-- Step 3: Update all existing users with default phone number
UPDATE users 
SET phone_number = '09356963201' 
WHERE phone_number IS NULL OR phone_number = '';

-- Step 4: Create OTP verifications table
CREATE TABLE IF NOT EXISTS otp_verifications (
    id SERIAL PRIMARY KEY,
    phone_number VARCHAR(11) NOT NULL,
    otp_code VARCHAR(6) NOT NULL,
    purpose VARCHAR(20) NOT NULL CHECK (purpose IN ('login', 'signup', 'activation')),
    is_verified BOOLEAN DEFAULT FALSE,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    attempts INTEGER DEFAULT 0,
    CONSTRAINT valid_phone_number CHECK (phone_number ~ '^09[0-9]{9}$'),
    CONSTRAINT valid_otp_code CHECK (otp_code ~ '^[0-9]{6}$')
);

-- Step 5: Add indexes for better performance
CREATE INDEX IF NOT EXISTS otp_verifications_phone_idx 
ON otp_verifications(phone_number);

CREATE INDEX IF NOT EXISTS otp_verifications_expires_idx 
ON otp_verifications(expires_at);

CREATE INDEX IF NOT EXISTS otp_verifications_purpose_idx 
ON otp_verifications(purpose);

CREATE INDEX IF NOT EXISTS otp_verifications_phone_purpose_idx 
ON otp_verifications(phone_number, purpose, is_verified);

-- Step 6: Create function to delete expired OTPs
CREATE OR REPLACE FUNCTION delete_expired_otps()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM otp_verifications 
    WHERE expires_at < NOW()
    RETURNING COUNT(*) INTO deleted_count;
    
    RAISE NOTICE 'Deleted % expired OTP records', deleted_count;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Step 7: Create function to increment attempts
CREATE OR REPLACE FUNCTION increment_otp_attempts(otp_id INTEGER)
RETURNS void AS $$
BEGIN
    UPDATE otp_verifications 
    SET attempts = attempts + 1 
    WHERE id = otp_id;
END;
$$ LANGUAGE plpgsql;

-- Step 8: Add RLS policies for otp_verifications table
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Allow anyone to insert OTP records (for signup/login)
CREATE POLICY "Allow insert OTP for anyone" ON otp_verifications
    FOR INSERT TO anon, authenticated
    WITH CHECK (true);

-- Allow users to read their own OTP records
CREATE POLICY "Users can read own OTP" ON otp_verifications
    FOR SELECT TO authenticated
    USING (phone_number IN (SELECT phone_number FROM users WHERE id = auth.uid()));

-- Allow system to update OTP records
CREATE POLICY "Allow update OTP" ON otp_verifications
    FOR UPDATE TO authenticated
    USING (true);

-- Step 9: Add comment to document the changes
COMMENT ON COLUMN users.phone_number IS 'User mobile phone number in Iranian format (09xxxxxxxxx)';
COMMENT ON TABLE otp_verifications IS 'Stores OTP codes for phone number verification';
COMMENT ON FUNCTION delete_expired_otps() IS 'Cleanup function to remove expired OTP records';

-- Step 10: Run initial cleanup
SELECT delete_expired_otps();

-- Step 11: Verify changes
DO $$
DECLARE
    user_count INTEGER;
    users_with_phone INTEGER;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO users_with_phone FROM users WHERE phone_number IS NOT NULL AND phone_number != '';
    
    RAISE NOTICE 'Total users: %', user_count;
    RAISE NOTICE 'Users with phone number: %', users_with_phone;
    
    IF user_count = users_with_phone THEN
        RAISE NOTICE '✅ All users have phone numbers assigned';
    ELSE
        RAISE WARNING '⚠️ Some users missing phone numbers: %', (user_count - users_with_phone);
    END IF;
END $$;

-- Step 12: Display sample data
SELECT 
    id,
    name,
    role,
    phone_number,
    email
FROM users
LIMIT 5;
