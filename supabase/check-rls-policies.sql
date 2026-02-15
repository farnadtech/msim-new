-- Check RLS policies on purchase_orders table
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies 
WHERE tablename = 'purchase_orders';

-- Check if RLS is enabled on purchase_orders
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE tablename = 'purchase_orders';

-- Check specific order
SELECT 
    po.*,
    sc.number as sim_number,
    u_buyer.name as buyer_name,
    u_seller.name as seller_name
FROM purchase_orders po
LEFT JOIN sim_cards sc ON sc.id = po.sim_card_id
LEFT JOIN users u_buyer ON u_buyer.id = po.buyer_id
LEFT JOIN users u_seller ON u_seller.id = po.seller_id
WHERE po.id = 58;

-- Check if seller user exists
SELECT id, name, email, role 
FROM users 
WHERE id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48';

-- Check activation_requests for this order
SELECT * 
FROM activation_requests 
WHERE purchase_order_id = 58;
