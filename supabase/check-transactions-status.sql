-- بررسی وضعیت کامل جدول transactions

-- 1. بررسی وضعیت RLS
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE tablename = 'transactions';

-- 2. لیست تمام policies فعال
SELECT 
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE tablename = 'transactions';

-- 3. تعداد کل تراکنش‌ها (بدون فیلتر)
SELECT 
    'تعداد کل تراکنش‌ها' as info,
    COUNT(*) as count
FROM transactions;

-- 4. تراکنش‌های هر کاربر
SELECT 
    user_id,
    COUNT(*) as transaction_count,
    MIN(created_at) as first_transaction,
    MAX(created_at) as last_transaction
FROM transactions
GROUP BY user_id
ORDER BY transaction_count DESC;

-- 5. نمونه تراکنش‌های اخیر
SELECT 
    id,
    user_id,
    type,
    amount,
    description,
    date,
    created_at
FROM transactions
ORDER BY created_at DESC
LIMIT 10;
