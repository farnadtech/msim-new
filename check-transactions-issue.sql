-- بررسی مشکل تراکنش‌ها

-- 1. بررسی تراکنش‌های اخیر
SELECT 
    t.id,
    t.user_id,
    u.name as user_name,
    u.role,
    t.type,
    t.amount,
    t.description,
    t.date,
    t.created_at
FROM transactions t
LEFT JOIN users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 20;

-- 2. بررسی تراکنش‌های مربوط به purchase_orders
SELECT 
    po.id as order_id,
    po.status,
    po.line_type,
    po.buyer_id,
    po.seller_id,
    po.price,
    po.seller_received_amount,
    COUNT(t.id) as transaction_count
FROM purchase_orders po
LEFT JOIN transactions t ON (
    t.user_id = po.buyer_id OR t.user_id = po.seller_id
)
WHERE po.status = 'completed'
GROUP BY po.id, po.status, po.line_type, po.buyer_id, po.seller_id, po.price, po.seller_received_amount
ORDER BY po.id DESC
LIMIT 10;

-- 3. بررسی RLS policies
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
WHERE tablename = 'transactions';

-- 4. بررسی آیا RLS فعال است
SELECT 
    tablename,
    rowsecurity
FROM pg_tables
WHERE tablename = 'transactions';
