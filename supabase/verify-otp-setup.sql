-- Verify OTP Setup - Run this to confirm everything is working

-- Check 1: Verify users have phone_number column and default phone
SELECT 
    'Users with phone numbers' as check_name,
    COUNT(*) as total_users,
    COUNT(phone_number) as users_with_phone,
    COUNT(CASE WHEN phone_number = '09356963201' THEN 1 END) as users_with_default
FROM users;

-- Check 2: Verify otp_verifications table exists and structure
SELECT 
    'OTP table columns' as check_name,
    column_name,
    data_type
FROM information_schema.columns
WHERE table_name = 'otp_verifications'
ORDER BY ordinal_position;

-- Check 3: Verify indexes exist
SELECT 
    'OTP table indexes' as check_name,
    indexname
FROM pg_indexes
WHERE tablename = 'otp_verifications'
ORDER BY indexname;

-- Check 4: Verify RLS is enabled
SELECT 
    'OTP RLS Status' as check_name,
    relname as table_name,
    relrowsecurity as rls_enabled
FROM pg_class
WHERE relname = 'otp_verifications';

-- Check 5: List all RLS policies
SELECT 
    'OTP RLS Policies' as check_name,
    policyname,
    CASE WHEN cmd = '*' THEN 'ALL' ELSE cmd END as operation
FROM pg_policies
WHERE tablename = 'otp_verifications'
ORDER BY policyname;
