-- Fix: Assign default phone numbers to all users
-- This needs to be done carefully because of the unique constraint

-- Step 1: Temporarily disable the constraint
ALTER TABLE otp_verifications DISABLE ROW LEVEL SECURITY;

-- Step 2: Update all users to have the default phone number
UPDATE users 
SET phone_number = '09356963201' 
WHERE phone_number IS NULL OR phone_number = '';

-- Step 3: Re-enable RLS
ALTER TABLE otp_verifications ENABLE ROW LEVEL SECURITY;

-- Step 4: Verify the update
SELECT 
    COUNT(*) as total_users,
    COUNT(phone_number) as users_with_phone,
    COUNT(CASE WHEN phone_number = '09356963201' THEN 1 END) as users_with_default_phone
FROM users;
