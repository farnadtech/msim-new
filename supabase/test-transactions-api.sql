-- تست API تراکنش‌ها - شبیه‌سازی کوئری که از فرانت‌اند اجرا می‌شود

-- 1. بررسی تعداد کل تراکنش‌ها
SELECT 
    'تعداد کل تراکنش‌ها' as test,
    COUNT(*) as count
FROM transactions;

-- 2. تراکنش‌های خریدار (user_id: 5f4488db-9bed-4162-8925-d187f8bb423d)
SELECT 
    'تراکنش‌های خریدار' as category,
    id,
    user_id,
    type,
    amount,
    description,
    date,
    created_at
FROM transactions
WHERE user_id = '5f4488db-9bed-4162-8925-d187f8bb423d'
ORDER BY date DESC;

-- 3. تراکنش‌های فروشنده (user_id: d8841504-fb63-41d1-91b0-8cf66f8edf48)
SELECT 
    'تراکنش‌های فروشنده' as category,
    id,
    user_id,
    type,
    amount,
    description,
    date,
    created_at
FROM transactions
WHERE user_id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48'
ORDER BY date DESC;

-- 4. بررسی وضعیت RLS
SELECT 
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'transactions';

-- 5. لیست policies فعال
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual
FROM pg_policies
WHERE tablename = 'transactions';
