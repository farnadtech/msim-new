-- Verify Phone Number & OTP Setup
-- Run this to check if migration was successful

-- Step 1: Check if phone_number column exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'phone_number'
    ) THEN
        RAISE NOTICE '✅ phone_number column exists in users table';
    ELSE
        RAISE NOTICE '❌ phone_number column NOT found in users table';
    END IF;
END $$;

-- Step 2: Check if all users have phone numbers
SELECT 
    COUNT(*) as total_users,
    COUNT(phone_number) as users_with_phone,
    COUNT(*) - COUNT(phone_number) as users_without_phone
FROM users;

-- Step 3: Show sample users
SELECT 
    id,
    name,
    email,
    phone_number,
    role
FROM users
LIMIT 10;

-- Step 4: Check if otp_verifications table exists
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'otp_verifications'
    ) THEN
        RAISE NOTICE '✅ otp_verifications table exists';
    ELSE
        RAISE NOTICE '❌ otp_verifications table NOT found';
    END IF;
END $$;

-- Step 5: Show OTP table structure
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'otp_verifications'
ORDER BY ordinal_position;

-- Step 6: Check OTP records
SELECT 
    COUNT(*) as total_otp_records,
    COUNT(CASE WHEN is_verified THEN 1 END) as verified_otps,
    COUNT(CASE WHEN is_verified = FALSE THEN 1 END) as pending_otps
FROM otp_verifications;

-- Step 7: Summary
DO $$
DECLARE
    user_count INTEGER;
    users_with_phone INTEGER;
    otp_table_exists BOOLEAN;
BEGIN
    SELECT COUNT(*) INTO user_count FROM users;
    SELECT COUNT(*) INTO users_with_phone FROM users WHERE phone_number IS NOT NULL;
    
    SELECT EXISTS(
        SELECT 1 FROM information_schema.tables 
        WHERE table_name = 'otp_verifications'
    ) INTO otp_table_exists;
    
    RAISE NOTICE '
═════════════════════════════════════════════════════════
✅ PHONE NUMBER & OTP SETUP VERIFICATION
═════════════════════════════════════════════════════════
Total Users: %
Users with Phone: %
OTP Table Exists: %

STATUS: % Setup Complete!
═════════════════════════════════════════════════════════
    ', user_count, users_with_phone, otp_table_exists,
    CASE WHEN user_count = users_with_phone AND otp_table_exists THEN '✅ ALL' ELSE '⚠️ PARTIAL' END;
END $$;
