-- Fix RLS policies for purchase_orders table
-- This ensures sellers and buyers can see their orders

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can view their own purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Buyers can view their purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Sellers can view their purchase orders" ON purchase_orders;
DROP POLICY IF EXISTS "Admins can view all purchase orders" ON purchase_orders;

-- Enable RLS on purchase_orders table
ALTER TABLE purchase_orders ENABLE ROW LEVEL SECURITY;

-- Policy for buyers to see their orders
CREATE POLICY "Buyers can view their purchase orders"
ON purchase_orders
FOR SELECT
USING (
    auth.uid() = buyer_id
);

-- Policy for sellers to see their orders
CREATE POLICY "Sellers can view their purchase orders"
ON purchase_orders
FOR SELECT
USING (
    auth.uid() = seller_id
);

-- Policy for admins to see all orders
CREATE POLICY "Admins can view all purchase orders"
ON purchase_orders
FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM users
        WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
);

-- Policy for inserting purchase orders (buyers can create)
CREATE POLICY "Buyers can create purchase orders"
ON purchase_orders
FOR INSERT
WITH CHECK (
    auth.uid() = buyer_id
);

-- Policy for updating purchase orders (buyers and sellers can update their own)
CREATE POLICY "Users can update their purchase orders"
ON purchase_orders
FOR UPDATE
USING (
    auth.uid() = buyer_id OR auth.uid() = seller_id
);

-- Verify policies were created
SELECT 
    policyname,
    cmd,
    qual
FROM pg_policies 
WHERE tablename = 'purchase_orders';
