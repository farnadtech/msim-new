-- New Auction Guarantee Deposit System Schema

-- 1. Add new columns to auction_details table
ALTER TABLE auction_details 
ADD COLUMN IF NOT EXISTS status TEXT CHECK (status IN ('active', 'ended', 'pending_payment', 'completed', 'cancelled')) DEFAULT 'active',
ADD COLUMN IF NOT EXISTS base_price NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS guarantee_deposit_amount NUMERIC NOT NULL DEFAULT 0,
ADD COLUMN IF NOT EXISTS winner_rank INTEGER,
ADD COLUMN IF NOT EXISTS final_winner_id UUID REFERENCES users(id),
ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW();

-- 2. Create auction_participants table (tracks all bidders per auction)
CREATE TABLE IF NOT EXISTS auction_participants (
  id SERIAL PRIMARY KEY,
  auction_id INTEGER REFERENCES auction_details(id) ON DELETE CASCADE,
  sim_card_id INTEGER REFERENCES sim_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  highest_bid NUMERIC NOT NULL,
  bid_count INTEGER DEFAULT 1,
  rank INTEGER,
  guarantee_deposit_amount NUMERIC NOT NULL DEFAULT 0,
  guarantee_deposit_blocked BOOLEAN DEFAULT false,
  is_top_3 BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(auction_id, user_id, sim_card_id)
);

-- 3. Create guarantee_deposits table (tracks deposit blocks)
CREATE TABLE IF NOT EXISTS guarantee_deposits (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  auction_id INTEGER REFERENCES auction_details(id) ON DELETE CASCADE,
  sim_card_id INTEGER REFERENCES sim_cards(id) ON DELETE CASCADE,
  amount NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('blocked', 'released', 'burned')) DEFAULT 'blocked',
  reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Create auction_winner_queue table (handles multi-stage winner payment)
CREATE TABLE IF NOT EXISTS auction_winner_queue (
  id SERIAL PRIMARY KEY,
  auction_id INTEGER REFERENCES auction_details(id) ON DELETE CASCADE,
  sim_card_id INTEGER REFERENCES sim_cards(id) ON DELETE CASCADE,
  winner_rank INTEGER NOT NULL,
  user_id UUID REFERENCES users(id),
  highest_bid NUMERIC NOT NULL,
  payment_status TEXT CHECK (payment_status IN ('pending', 'completed', 'failed', 'burned')) DEFAULT 'pending',
  remaining_amount NUMERIC NOT NULL,
  payment_deadline TIMESTAMP WITH TIME ZONE,
  payment_completed_at TIMESTAMP WITH TIME ZONE,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Create auction_payments table (tracks payment history)
CREATE TABLE IF NOT EXISTS auction_payments (
  id SERIAL PRIMARY KEY,
  auction_id INTEGER REFERENCES auction_details(id) ON DELETE CASCADE,
  sim_card_id INTEGER REFERENCES sim_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  winner_rank INTEGER NOT NULL,
  bid_amount NUMERIC NOT NULL,
  guarantee_deposit_amount NUMERIC NOT NULL,
  remaining_amount NUMERIC NOT NULL,
  status TEXT CHECK (status IN ('pending', 'completed', 'failed')) DEFAULT 'pending',
  payment_method TEXT,
  transaction_id INTEGER REFERENCES transactions(id),
  paid_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_auction_participants_auction_id ON auction_participants(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_participants_user_id ON auction_participants(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_participants_rank ON auction_participants(rank);
CREATE INDEX IF NOT EXISTS idx_auction_participants_is_top_3 ON auction_participants(is_top_3);

CREATE INDEX IF NOT EXISTS idx_guarantee_deposits_user_id ON guarantee_deposits(user_id);
CREATE INDEX IF NOT EXISTS idx_guarantee_deposits_auction_id ON guarantee_deposits(auction_id);
CREATE INDEX IF NOT EXISTS idx_guarantee_deposits_status ON guarantee_deposits(status);

CREATE INDEX IF NOT EXISTS idx_auction_winner_queue_auction_id ON auction_winner_queue(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_winner_queue_user_id ON auction_winner_queue(user_id);
CREATE INDEX IF NOT EXISTS idx_auction_winner_queue_payment_status ON auction_winner_queue(payment_status);
CREATE INDEX IF NOT EXISTS idx_auction_winner_queue_payment_deadline ON auction_winner_queue(payment_deadline);

CREATE INDEX IF NOT EXISTS idx_auction_payments_auction_id ON auction_payments(auction_id);
CREATE INDEX IF NOT EXISTS idx_auction_payments_user_id ON auction_payments(user_id);

CREATE INDEX IF NOT EXISTS idx_auction_details_status ON auction_details(status);
CREATE INDEX IF NOT EXISTS idx_auction_details_final_winner_id ON auction_details(final_winner_id);

-- 7. Enable RLS for new tables
ALTER TABLE auction_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE guarantee_deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_winner_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_payments ENABLE ROW LEVEL SECURITY;

-- 8. Create RLS policies
-- auction_participants: Users can view all participants (public info)
CREATE POLICY "Users can view auction participants" ON auction_participants
FOR SELECT USING (true);

-- guarantee_deposits: Only admins can view all, users see their own
CREATE POLICY "Users can view their own deposits" ON guarantee_deposits
FOR SELECT USING (user_id = auth.uid() OR EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- auction_winner_queue: Only relevant user and admins
CREATE POLICY "Users can view their own winner queue" ON auction_winner_queue
FOR SELECT USING (user_id = auth.uid() OR EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- auction_payments: Only relevant user and admins
CREATE POLICY "Users can view their own payments" ON auction_payments
FOR SELECT USING (user_id = auth.uid() OR EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- 9. Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE auction_participants TO anon, authenticated;
GRANT ALL ON TABLE guarantee_deposits TO anon, authenticated;
GRANT ALL ON TABLE auction_winner_queue TO anon, authenticated;
GRANT ALL ON TABLE auction_payments TO anon, authenticated;

GRANT USAGE ON SEQUENCE auction_participants_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE guarantee_deposits_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE auction_winner_queue_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE auction_payments_id_seq TO anon, authenticated;
