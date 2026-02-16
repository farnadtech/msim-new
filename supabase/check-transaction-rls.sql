-- بررسی RLS برای transactions

-- 1. بررسی وضعیت RLS
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'transactions';

-- 2. بررسی policies موجود
SELECT 
    policyname,
    cmd,
    roles,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'transactions';

-- 3. تست INSERT با یک تراکنش نمونه
-- این query باید با خطا مواجه بشه اگر RLS مشکل داره
-- INSERT INTO transactions (user_id, type, amount, description, date)
-- VALUES (
--     (SELECT id FROM users LIMIT 1),
--     'test',
--     1000,
--     'تست تراکنش',
--     NOW()
-- );

-- 4. بررسی تراکنش‌های اخیر
SELECT 
    t.id,
    t.user_id,
    u.name,
    t.type,
    t.amount,
    t.description,
    t.created_at
FROM transactions t
LEFT JOIN users u ON t.user_id = u.id
ORDER BY t.created_at DESC
LIMIT 10;

-- 5. بررسی تراکنش‌های مربوط به سفارش 1635
SELECT 
    t.*
FROM transactions t
WHERE t.description LIKE '%1635%';
