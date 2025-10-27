-- Supabase Schema for Msim724

-- Enable necessary extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  role TEXT CHECK (role IN ('admin', 'seller', 'buyer')) NOT NULL,
  email TEXT UNIQUE,
  wallet_balance NUMERIC DEFAULT 0,
  blocked_balance NUMERIC DEFAULT 0,
  phone_number TEXT,
  package_id INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Packages table
CREATE TABLE packages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  price NUMERIC NOT NULL,
  duration_days INTEGER NOT NULL,
  listing_limit INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sim cards table
CREATE TABLE sim_cards (
  id SERIAL PRIMARY KEY,
  number TEXT UNIQUE NOT NULL,
  price NUMERIC NOT NULL,
  seller_id UUID REFERENCES users(id),
  type TEXT CHECK (type IN ('fixed', 'auction', 'inquiry')) NOT NULL,
  status TEXT CHECK (status IN ('available', 'sold')) NOT NULL,
  sold_date TIMESTAMP WITH TIME ZONE,
  carrier TEXT CHECK (carrier IN ('همراه اول', 'ایرانسل', 'رایتل')) NOT NULL,
  is_rond BOOLEAN NOT NULL DEFAULT false,
  inquiry_phone_number TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Auction details for sim cards (one-to-one relationship)
CREATE TABLE auction_details (
  id SERIAL PRIMARY KEY,
  sim_card_id INTEGER REFERENCES sim_cards(id) ON DELETE CASCADE,
  end_time TIMESTAMP WITH TIME ZONE NOT NULL,
  current_bid NUMERIC NOT NULL,
  highest_bidder_id UUID REFERENCES users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(sim_card_id)
);

-- Bids table (for auction sim cards)
CREATE TABLE bids (
  id SERIAL PRIMARY KEY,
  sim_card_id INTEGER REFERENCES sim_cards(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id),
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transactions table
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  user_id UUID REFERENCES users(id),
  type TEXT CHECK (type IN ('deposit', 'withdrawal', 'purchase', 'sale')) NOT NULL,
  amount NUMERIC NOT NULL,
  date TIMESTAMP WITH TIME ZONE NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payment receipts table
CREATE TABLE payment_receipts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES users(id),
  user_name TEXT NOT NULL,
  amount NUMERIC NOT NULL,
  card_number TEXT,
  tracking_code TEXT,
  receipt_image_url TEXT,
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected')) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processed_by UUID REFERENCES users(id),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_package_id ON users(package_id);
CREATE INDEX idx_sim_cards_seller_id ON sim_cards(seller_id);
CREATE INDEX idx_sim_cards_number ON sim_cards(number);
CREATE INDEX idx_sim_cards_status ON sim_cards(status);
CREATE INDEX idx_sim_cards_carrier ON sim_cards(carrier);
CREATE INDEX idx_auction_details_sim_card_id ON auction_details(sim_card_id);
CREATE INDEX idx_auction_details_highest_bidder_id ON auction_details(highest_bidder_id);
CREATE INDEX idx_bids_sim_card_id ON bids(sim_card_id);
CREATE INDEX idx_bids_user_id ON bids(user_id);
CREATE INDEX idx_transactions_user_id ON transactions(user_id);
CREATE INDEX idx_transactions_date ON transactions(date);
CREATE INDEX idx_payment_receipts_user_id ON payment_receipts(user_id);
CREATE INDEX idx_payment_receipts_status ON payment_receipts(status);
CREATE INDEX idx_payment_receipts_tracking_code ON payment_receipts(tracking_code);

-- Enable Row Level Security (RLS) for all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sim_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE auction_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_receipts ENABLE ROW LEVEL SECURITY;

-- Create policies for RLS (basic policies - you may need to adjust based on your app's requirements)
CREATE POLICY "Users can view their own data" ON users FOR SELECT USING (id = auth.uid());
CREATE POLICY "Users can update their own data" ON users FOR UPDATE USING (id = auth.uid());
CREATE POLICY "Admins can view all users" ON users FOR SELECT USING (EXISTS(SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON TABLE users TO anon, authenticated;
GRANT ALL ON TABLE packages TO anon, authenticated;
GRANT ALL ON TABLE sim_cards TO anon, authenticated;
GRANT ALL ON TABLE auction_details TO anon, authenticated;
GRANT ALL ON TABLE bids TO anon, authenticated;
GRANT ALL ON TABLE transactions TO anon, authenticated;
GRANT ALL ON TABLE payment_receipts TO anon, authenticated;
GRANT USAGE ON SEQUENCE packages_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE sim_cards_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE auction_details_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE bids_id_seq TO anon, authenticated;
GRANT USAGE ON SEQUENCE transactions_id_seq TO anon, authenticated;