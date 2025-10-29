-- Fix: Remove UNIQUE constraint from buyer_code in secure_payments table
-- This allows multiple payments from the same buyer

-- Drop the unique constraint if it exists
ALTER TABLE secure_payments DROP CONSTRAINT IF EXISTS secure_payments_buyer_code_key;

-- Ensure the column still exists and is NOT NULL
ALTER TABLE secure_payments ALTER COLUMN buyer_code SET NOT NULL;
