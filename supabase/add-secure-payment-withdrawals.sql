-- Add withdrawal status tracking for secure payments
-- This tracks when a buyer has withdrawn funds, locking the SIM to that buyer

ALTER TABLE secure_payments ADD COLUMN IF NOT EXISTS withdrawn_at TIMESTAMP WITH TIME ZONE;
ALTER TABLE secure_payments ADD COLUMN IF NOT EXISTS locked_to_buyer_id UUID REFERENCES users(id);

-- Add index for locked_to_buyer_id
CREATE INDEX IF NOT EXISTS idx_secure_payments_locked_to_buyer ON secure_payments(locked_to_buyer_id);

-- Add column to track SIM card reservation (which secure payment has withdrawn)
ALTER TABLE sim_cards ADD COLUMN IF NOT EXISTS reserved_by_secure_payment_id INTEGER REFERENCES secure_payments(id);

CREATE INDEX IF NOT EXISTS idx_sim_cards_reserved_by_payment ON sim_cards(reserved_by_secure_payment_id);

-- Create or update RLS policies to prevent creating multiple payments for same SIM
-- (This will be enforced in the application layer with the reserved_by_secure_payment_id check)
