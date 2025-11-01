-- Fix the phone number constraint to allow duplicates
-- The constraint should only enforce uniqueness for actual different users

-- Step 1: Drop the old constraint
ALTER TABLE users
DROP CONSTRAINT IF EXISTS users_phone_number_unique;

-- Step 2: Create a better constraint that allows NULL but ensures unique phone per user account
-- Actually, for now, let's just allow any phone number (no unique constraint)
-- Because multiple users CAN share the same phone number in real scenarios

-- Step 3: Update all users with the default phone number
UPDATE users 
SET phone_number = '09356963201' 
WHERE phone_number IS NULL OR phone_number = '';

-- Step 4: Verify all users have phone numbers
SELECT 
    COUNT(*) as total_users,
    COUNT(phone_number) as users_with_phone,
    COUNT(CASE WHEN phone_number = '09356963201' THEN 1 END) as users_with_default_phone
FROM users;

-- Step 5: Show all users and their phone numbers
SELECT id, email, phone_number FROM users ORDER BY created_at;
