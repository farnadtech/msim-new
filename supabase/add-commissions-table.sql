-- Create commissions table to track platform commissions from SIM card sales
CREATE TABLE IF NOT EXISTS commissions (
  id SERIAL PRIMARY KEY,
  sim_card_id INTEGER REFERENCES sim_cards(id) ON DELETE CASCADE,
  seller_id UUID REFERENCES users(id),
  seller_name TEXT NOT NULL,
  sim_number TEXT NOT NULL,
  sale_price NUMERIC NOT NULL,
  commission_amount NUMERIC NOT NULL,
  commission_percentage INTEGER DEFAULT 2,
  seller_received_amount NUMERIC NOT NULL,
  sale_type TEXT CHECK (sale_type IN ('fixed', 'auction')) NOT NULL,
  buyer_id UUID REFERENCES users(id),
  buyer_name TEXT,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance (only if they don't exist)
CREATE INDEX IF NOT EXISTS idx_commissions_seller_id ON commissions(seller_id);
CREATE INDEX IF NOT EXISTS idx_commissions_buyer_id ON commissions(buyer_id);
CREATE INDEX IF NOT EXISTS idx_commissions_date ON commissions(date);
CREATE INDEX IF NOT EXISTS idx_commissions_created_at ON commissions(created_at);

-- Enable RLS
ALTER TABLE commissions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (to avoid conflicts)
DROP POLICY IF EXISTS "Authenticated users can view commissions" ON commissions;
DROP POLICY IF EXISTS "System can insert commissions" ON commissions;

-- Create RLS policies
CREATE POLICY "Authenticated users can view commissions" 
  ON commissions FOR SELECT 
  TO authenticated 
  USING (true);

CREATE POLICY "System can insert commissions" 
  ON commissions FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Grant permissions
GRANT ALL ON TABLE commissions TO anon, authenticated;
GRANT USAGE ON SEQUENCE commissions_id_seq TO anon, authenticated;
