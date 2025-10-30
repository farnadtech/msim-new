-- Create purchase_orders table for managing multi-step purchase workflow
CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  sim_card_id INTEGER NOT NULL REFERENCES sim_cards(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  line_type TEXT NOT NULL CHECK (line_type IN ('inactive', 'active')),
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'code_sent', 'code_verified', 'document_pending', 'document_submitted', 'document_rejected', 'verified', 'completed', 'cancelled')),
  price BIGINT NOT NULL,
  commission_amount BIGINT NOT NULL,
  seller_received_amount BIGINT NOT NULL,
  buyer_blocked_amount BIGINT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create activation_codes table for inactive lines
CREATE TABLE IF NOT EXISTS activation_codes (
  id SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  code TEXT NOT NULL UNIQUE,
  phone_number TEXT NOT NULL,
  sent_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  verified_at TIMESTAMP WITH TIME ZONE,
  is_used BOOLEAN DEFAULT false
);

-- Create seller_documents table for active line verification
CREATE TABLE IF NOT EXISTS seller_documents (
  id SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL DEFAULT 'handwriting' CHECK (document_type IN ('handwriting', 'verification')),
  image_url TEXT,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Create admin_verifications table
CREATE TABLE IF NOT EXISTS admin_verifications (
  id SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  admin_id UUID NOT NULL REFERENCES users(id),
  document_id INTEGER REFERENCES seller_documents(id),
  verification_type TEXT NOT NULL CHECK (verification_type IN ('document', 'final_approval')),
  status TEXT NOT NULL CHECK (status IN ('approved', 'rejected')),
  notes TEXT,
  verified_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create support_messages table for buyer-seller communication
CREATE TABLE IF NOT EXISTS support_messages (
  id SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id),
  receiver_id UUID NOT NULL REFERENCES users(id),
  message TEXT NOT NULL,
  message_type TEXT DEFAULT 'problem_report' CHECK (message_type IN ('problem_report', 'response')),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create tracking_codes table for active line orders
CREATE TABLE IF NOT EXISTS tracking_codes (
  id SERIAL PRIMARY KEY,
  purchase_order_id INTEGER NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE UNIQUE,
  code TEXT NOT NULL UNIQUE,
  contact_phone TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_purchase_orders_buyer_id ON purchase_orders(buyer_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_seller_id ON purchase_orders(seller_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_status ON purchase_orders(status);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_line_type ON purchase_orders(line_type);
CREATE INDEX IF NOT EXISTS idx_activation_codes_purchase_order_id ON activation_codes(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_seller_documents_purchase_order_id ON seller_documents(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_purchase_order_id ON support_messages(purchase_order_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_sender_id ON support_messages(sender_id);

-- Enable Row Level Security
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE activation_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE seller_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE admin_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE tracking_codes ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can update their purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Users can view activation codes for their orders" ON activation_codes;
DROP POLICY IF EXISTS "Users can view seller documents for their orders" ON seller_documents;
DROP POLICY IF EXISTS "Admins can view all verifications" ON admin_verifications;
DROP POLICY IF EXISTS "Users can view support messages for their orders" ON support_messages;
DROP POLICY IF EXISTS "Users can insert support messages" ON support_messages;

-- Create RLS policies for purchase_orders
CREATE POLICY "Users can view their purchase orders" 
  ON purchase_orders FOR SELECT 
  TO authenticated 
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can update their purchase orders" 
  ON purchase_orders FOR UPDATE 
  TO authenticated 
  USING (buyer_id = auth.uid() OR seller_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ))
  WITH CHECK (buyer_id = auth.uid() OR seller_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "System can insert purchase orders" 
  ON purchase_orders FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create RLS policies for activation_codes
CREATE POLICY "Users can view activation codes for their orders" 
  ON activation_codes FOR SELECT 
  TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM purchase_orders 
    WHERE purchase_orders.id = activation_codes.purchase_order_id 
    AND (purchase_orders.buyer_id = auth.uid() OR purchase_orders.seller_id = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "System can insert and update activation codes" 
  ON activation_codes FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create RLS policies for seller_documents
CREATE POLICY "Users can view seller documents for their orders" 
  ON seller_documents FOR SELECT 
  TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM purchase_orders 
    WHERE purchase_orders.id = seller_documents.purchase_order_id 
    AND (purchase_orders.buyer_id = auth.uid() OR purchase_orders.seller_id = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "System can insert and update seller documents" 
  ON seller_documents FOR INSERT 
  TO authenticated 
  WITH CHECK (true);

-- Create RLS policies for admin_verifications
CREATE POLICY "Admins can view all verifications" 
  ON admin_verifications FOR SELECT 
  TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Admins can insert verifications" 
  ON admin_verifications FOR INSERT 
  TO authenticated 
  WITH CHECK (EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Create RLS policies for support_messages
CREATE POLICY "Users can view support messages for their orders" 
  ON support_messages FOR SELECT 
  TO authenticated 
  USING (sender_id = auth.uid() OR receiver_id = auth.uid() OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

CREATE POLICY "Users can insert support messages" 
  ON support_messages FOR INSERT 
  TO authenticated 
  WITH CHECK (sender_id = auth.uid());

-- Create RLS policies for tracking_codes
CREATE POLICY "Users can view tracking codes for their orders" 
  ON tracking_codes FOR SELECT 
  TO authenticated 
  USING (EXISTS (
    SELECT 1 FROM purchase_orders 
    WHERE purchase_orders.id = tracking_codes.purchase_order_id 
    AND (purchase_orders.buyer_id = auth.uid() OR purchase_orders.seller_id = auth.uid())
  ) OR EXISTS (
    SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'
  ));

-- Grant permissions
GRANT ALL ON TABLE purchase_orders TO authenticated;
GRANT ALL ON TABLE activation_codes TO authenticated;
GRANT ALL ON TABLE seller_documents TO authenticated;
GRANT ALL ON TABLE admin_verifications TO authenticated;
GRANT ALL ON TABLE support_messages TO authenticated;
GRANT ALL ON TABLE tracking_codes TO authenticated;

GRANT USAGE ON SEQUENCE purchase_orders_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE activation_codes_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE seller_documents_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE admin_verifications_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE support_messages_id_seq TO authenticated;
GRANT USAGE ON SEQUENCE tracking_codes_id_seq TO authenticated;
