-- Update RLS policy to allow public inserts for auction_participants
-- This is needed because the Supabase client uses anon key which is "public" role

-- Drop the existing restrictive policy
DROP POLICY IF EXISTS "Allow users to create participant records" ON auction_participants;

-- Create new policy that allows public inserts (with anon key)
CREATE POLICY "Allow public to create participant records"
ON auction_participants
FOR INSERT
TO public
WITH CHECK (true);

-- Verify the policy was created
SELECT schemaname, tablename, policyname, permissive, roles, cmd
FROM pg_policies
WHERE tablename = 'auction_participants' AND policyname = 'Allow public to create participant records';
