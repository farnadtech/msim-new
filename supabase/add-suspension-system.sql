-- Add suspension and negative score system to users table
-- This migration adds fields for user suspension, negative scoring, and related timestamps

-- Add new columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS is_suspended BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMP;
ALTER TABLE users ADD COLUMN IF NOT EXISTS suspension_reason TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS negative_score INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_penalty_at TIMESTAMP;

-- Create suspension_requests table for users to request unsuspension
CREATE TABLE IF NOT EXISTS suspension_requests (
    id SERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    admin_response TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    reviewed_by UUID REFERENCES users(id),
    reviewed_at TIMESTAMP
);

-- Add activation_deadline to purchase_orders table
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS activation_deadline TIMESTAMP;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS is_cancelled BOOLEAN DEFAULT FALSE;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS cancellation_reason TEXT;
ALTER TABLE purchase_orders ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMP;

-- Add expiry_date to sim_cards table for listing expiration
ALTER TABLE sim_cards ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE sim_cards ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMP;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_users_suspended ON users(is_suspended);
CREATE INDEX IF NOT EXISTS idx_users_negative_score ON users(negative_score);
CREATE INDEX IF NOT EXISTS idx_suspension_requests_status ON suspension_requests(status);
CREATE INDEX IF NOT EXISTS idx_suspension_requests_user ON suspension_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_deadline ON purchase_orders(activation_deadline);
CREATE INDEX IF NOT EXISTS idx_sim_cards_expiry ON sim_cards(expiry_date);

-- Enable RLS on suspension_requests
ALTER TABLE suspension_requests ENABLE ROW LEVEL SECURITY;

-- Allow users to view their own suspension requests or admins to view all
DROP POLICY IF EXISTS "Users can view own suspension requests" ON suspension_requests;
DROP POLICY IF EXISTS "Admins can view all suspension requests" ON suspension_requests;
CREATE POLICY "Users and admins can view suspension requests"
ON suspension_requests
FOR SELECT
TO authenticated
USING (
    (user_id = auth.uid()) OR 
    (EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    ))
);

-- Allow users to create suspension requests
DROP POLICY IF EXISTS "Users can create suspension requests" ON suspension_requests;
CREATE POLICY "Users can create suspension requests"
ON suspension_requests
FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Allow admins to update suspension requests
DROP POLICY IF EXISTS "Admins can update suspension requests" ON suspension_requests;
CREATE POLICY "Admins can update suspension requests"
ON suspension_requests
FOR UPDATE
TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
)
WITH CHECK (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Function to automatically set activation deadline when purchase order is created
CREATE OR REPLACE FUNCTION set_activation_deadline()
RETURNS TRIGGER AS $$
BEGIN
    -- Set deadline to 48 hours from now
    NEW.activation_deadline := NOW() + INTERVAL '48 hours';
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for setting activation deadline
DROP TRIGGER IF EXISTS trigger_set_activation_deadline ON purchase_orders;
CREATE TRIGGER trigger_set_activation_deadline
    BEFORE INSERT ON purchase_orders
    FOR EACH ROW
    EXECUTE FUNCTION set_activation_deadline();

-- Function to set sim card expiry date based on site settings
CREATE OR REPLACE FUNCTION set_sim_card_expiry()
RETURNS TRIGGER AS $$
DECLARE
    max_days INTEGER;
BEGIN
    -- Get max duration from settings (default 90 days)
    SELECT COALESCE(
        (SELECT setting_value::INTEGER FROM site_settings WHERE setting_key = 'listing_max_duration_days'),
        90
    ) INTO max_days;
    
    -- Set expiry date
    NEW.expiry_date := NOW() + (max_days || ' days')::INTERVAL;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for setting sim card expiry
DROP TRIGGER IF EXISTS trigger_set_sim_card_expiry ON sim_cards;
CREATE TRIGGER trigger_set_sim_card_expiry
    BEFORE INSERT ON sim_cards
    FOR EACH ROW
    EXECUTE FUNCTION set_sim_card_expiry();

COMMENT ON COLUMN users.is_suspended IS 'آیا حساب کاربری تعلیق شده است';
COMMENT ON COLUMN users.negative_score IS 'امتیاز منفی کاربر (هر بار عدم فعال‌سازی خط +1)';
COMMENT ON COLUMN users.last_penalty_at IS 'آخرین زمان اعمال جریمه';
COMMENT ON TABLE suspension_requests IS 'درخواست‌های رفع تعلیق کاربران';
COMMENT ON COLUMN purchase_orders.activation_deadline IS 'مهلت 48 ساعته برای فعال‌سازی خط توسط فروشنده';
COMMENT ON COLUMN sim_cards.expiry_date IS 'تاریخ انقضای آگهی (حذف خودکار)';
