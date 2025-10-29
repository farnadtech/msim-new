-- Create secure payments table for escrow-based transactions
CREATE TABLE IF NOT EXISTS secure_payments (
  id SERIAL PRIMARY KEY,
  buyer_id UUID REFERENCES users(id),
  buyer_name TEXT NOT NULL,
  seller_id UUID REFERENCES users(id),
  seller_name TEXT NOT NULL,
  sim_card_id INTEGER REFERENCES sim_cards(id),
  sim_number TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'cancelled', 'released')) DEFAULT 'pending',
  buyer_code TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  released_at TIMESTAMP WITH TIME ZONE
);

-- Create table to store buyer unique payment codes
CREATE TABLE IF NOT EXISTS buyer_payment_codes (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id) UNIQUE NOT NULL,
  payment_code TEXT UNIQUE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_secure_payments_buyer_id ON secure_payments(buyer_id);
CREATE INDEX IF NOT EXISTS idx_secure_payments_seller_id ON secure_payments(seller_id);
CREATE INDEX IF NOT EXISTS idx_secure_payments_sim_card_id ON secure_payments(sim_card_id);
CREATE INDEX IF NOT EXISTS idx_secure_payments_status ON secure_payments(status);
CREATE INDEX IF NOT EXISTS idx_secure_payments_buyer_code ON secure_payments(buyer_code);
CREATE INDEX IF NOT EXISTS idx_secure_payments_created_at ON secure_payments(created_at);
CREATE INDEX IF NOT EXISTS idx_buyer_payment_codes_user_id ON buyer_payment_codes(user_id);
CREATE INDEX IF NOT EXISTS idx_buyer_payment_codes_code ON buyer_payment_codes(payment_code);

-- Enable RLS
ALTER TABLE secure_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE buyer_payment_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Users can view their secure payments" ON secure_payments;
DROP POLICY IF EXISTS "Sellers can create secure payments" ON secure_payments;
DROP POLICY IF EXISTS "Buyers can update their secure payments" ON secure_payments;
DROP POLICY IF EXISTS "Users can view their own payment code" ON buyer_payment_codes;
DROP POLICY IF EXISTS "Anyone can view payment codes for verification" ON buyer_payment_codes;
DROP POLICY IF EXISTS "System can manage payment codes" ON buyer_payment_codes;

-- Create RLS policies for secure_payments
CREATE POLICY "Users can view their secure payments" 
  ON secure_payments FOR SELECT 
  TO authenticated 
  USING (buyer_id = auth.uid() OR seller_id = auth.uid());

CREATE POLICY "Sellers can create secure payments" 
  ON secure_payments FOR INSERT 
  TO authenticated 
  WITH CHECK (seller_id = auth.uid());

CREATE POLICY "Buyers can update their secure payments" 
  ON secure_payments FOR UPDATE 
  TO authenticated 
  USING (buyer_id = auth.uid());

-- Create RLS policies for buyer_payment_codes
-- Allow anyone to read payment codes (for verification purposes)
CREATE POLICY "Public can read payment codes" 
  ON buyer_payment_codes FOR SELECT 
  USING (true);

CREATE POLICY "Authenticated users can create payment codes" 
  ON buyer_payment_codes FOR INSERT 
  TO authenticated 
  WITH CHECK (user_id = auth.uid());

-- Grant permissions
GRANT ALL ON TABLE secure_payments TO anon, authenticated;
GRANT ALL ON TABLE buyer_payment_codes TO anon, authenticated;
GRANT USAGE ON SEQUENCE secure_payments_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE buyer_payment_codes_id_seq TO anon, authenticated;

-- Allow public queries to buyer_payment_codes for code verification (read-only)
GRANT SELECT ON TABLE buyer_payment_codes TO anon, authenticated;
