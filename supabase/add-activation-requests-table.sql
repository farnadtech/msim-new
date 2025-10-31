-- Create activation_requests table for zero-line SIMs
CREATE TABLE IF NOT EXISTS activation_requests (
    id BIGSERIAL PRIMARY KEY,
    purchase_order_id BIGINT NOT NULL REFERENCES purchase_orders(id) ON DELETE CASCADE,
    sim_card_id BIGINT NOT NULL REFERENCES sim_cards(id) ON DELETE CASCADE,
    buyer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seller_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    sim_number TEXT NOT NULL,
    buyer_name TEXT NOT NULL,
    seller_name TEXT NOT NULL,
    
    -- Activation code sent by seller
    activation_code TEXT,
    sent_at TIMESTAMP,
    
    -- Status tracking
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'activated')),
    
    -- Admin approval/rejection
    admin_id UUID REFERENCES users(id),
    admin_notes TEXT,
    verified_at TIMESTAMP,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Add RLS policies
ALTER TABLE activation_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Admins can view all activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Sellers can view their own activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Buyers can view their own activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Sellers can update their own activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Admins can update activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Admins can insert activation requests" ON activation_requests;
DROP POLICY IF EXISTS "System can insert activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Users can insert their own activation requests" ON activation_requests;
DROP POLICY IF EXISTS "Service role can insert activation requests" ON activation_requests;

-- Allow admins to view all activation requests
CREATE POLICY "Admins can view all activation requests"
    ON activation_requests FOR SELECT
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- Allow sellers to view their own activation requests
CREATE POLICY "Sellers can view their own activation requests"
    ON activation_requests FOR SELECT
    USING (
        auth.uid() = seller_id
    );

-- Allow buyers to view their own activation requests
CREATE POLICY "Buyers can view their own activation requests"
    ON activation_requests FOR SELECT
    USING (
        auth.uid() = buyer_id
    );

-- Allow sellers to update their own activation requests (to send code)
CREATE POLICY "Sellers can update their own activation requests"
    ON activation_requests FOR UPDATE
    USING (auth.uid() = seller_id)
    WITH CHECK (auth.uid() = seller_id);

-- Allow admins to update activation requests
CREATE POLICY "Admins can update activation requests"
    ON activation_requests FOR UPDATE
    USING (
        auth.uid() IN (
            SELECT id FROM users WHERE role = 'admin'
        )
    );

-- Allow authenticated users to insert activation requests they own
CREATE POLICY "Users can insert their own activation requests"
    ON activation_requests FOR INSERT
    WITH CHECK (auth.uid() = buyer_id);

-- Allow system/service role to insert (for API calls)
CREATE POLICY "Service role can insert activation requests"
    ON activation_requests FOR INSERT
    WITH CHECK (true);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_activation_requests_buyer_id ON activation_requests(buyer_id);
CREATE INDEX IF NOT EXISTS idx_activation_requests_seller_id ON activation_requests(seller_id);
CREATE INDEX IF NOT EXISTS idx_activation_requests_status ON activation_requests(status);
CREATE INDEX IF NOT EXISTS idx_activation_requests_purchase_order_id ON activation_requests(purchase_order_id);