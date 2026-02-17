-- بررسی تراکنش‌های مربوط به حراجی 44444422222

-- تراکنش‌های خریدار
SELECT 
    'تراکنش‌های خریدار' as category,
    t.id,
    t.type,
    t.amount,
    t.description,
    t.date,
    t.created_at
FROM transactions t
WHERE t.user_id = '5f4488db-9bed-4162-8925-d187f8bb423d'
    AND t.description LIKE '%44444422222%'
ORDER BY t.created_at DESC;

-- تراکنش‌های فروشنده
SELECT 
    'تراکنش‌های فروشنده' as category,
    t.id,
    t.type,
    t.amount,
    t.description,
    t.date,
    t.created_at
FROM transactions t
WHERE t.user_id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48'
    AND t.description LIKE '%44444422222%'
ORDER BY t.created_at DESC;

-- بررسی RLS policies
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
