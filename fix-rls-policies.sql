-- Fix Row-Level Security policies for auction_participants table
-- Run this in Supabase SQL Editor

-- First, drop existing restrictive policies if any
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON auction_participants;
DROP POLICY IF EXISTS "Enable read access for all users" ON auction_participants;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON auction_participants;

-- Create new permissive policies

-- Allow authenticated users to insert their own participant records
CREATE POLICY "Allow users to create participant records"
ON auction_participants
FOR INSERT
TO authenticated
WITH CHECK (true); -- Allow all inserts from authenticated users

-- Allow everyone to read all participant records (for leaderboards)
CREATE POLICY "Allow public read access"
ON auction_participants
FOR SELECT
TO public
USING (true);

-- Allow users to update their own participant records
CREATE POLICY "Allow users to update own records"
ON auction_participants
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id::uuid)
WITH CHECK (auth.uid() = user_id::uuid);

-- Allow system/admin to update any participant record
CREATE POLICY "Allow admin to update any record"
ON auction_participants
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id::uuid = auth.uid()
    AND users.role = 'admin'
  )
);

-- Allow system to delete participant records (for cleanup)
CREATE POLICY "Allow admin to delete records"
ON auction_participants
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id::uuid = auth.uid()
    AND users.role = 'admin'
  )
);

-- Ensure RLS is enabled
ALTER TABLE auction_participants ENABLE ROW LEVEL SECURITY;

-- Show current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'auction_participants';


-- ============================================================================
-- FIX guarantee_deposits TABLE RLS
-- ============================================================================

-- Drop existing restrictive policies
DROP POLICY IF EXISTS "Enable insert for authenticated users" ON guarantee_deposits;
DROP POLICY IF EXISTS "Enable read access for all users" ON guarantee_deposits;
DROP POLICY IF EXISTS "Enable update for users based on user_id" ON guarantee_deposits;

-- Allow authenticated users to insert guarantee deposit records
CREATE POLICY "Allow users to create guarantee deposits"
ON guarantee_deposits
FOR INSERT
TO authenticated
WITH CHECK (true);

-- Allow users to read their own deposit records
CREATE POLICY "Allow users to read own deposits"
ON guarantee_deposits
FOR SELECT
TO authenticated
USING (auth.uid() = user_id::uuid);

-- Allow admin to read all deposits
CREATE POLICY "Allow admin to read all deposits"
ON guarantee_deposits
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM users
    WHERE users.id::uuid = auth.uid()
    AND users.role = 'admin'
  )
);

-- Allow system to update deposit status
CREATE POLICY "Allow system to update deposits"
ON guarantee_deposits
FOR UPDATE
TO authenticated
WITH CHECK (true);

-- Ensure RLS is enabled
ALTER TABLE guarantee_deposits ENABLE ROW LEVEL SECURITY;

-- Show current policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual, with_check
FROM pg_policies
WHERE tablename = 'guarantee_deposits';
