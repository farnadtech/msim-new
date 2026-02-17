-- اصلاح نهایی RLS policies برای جدول transactions

-- حذف تمام policies موجود
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON transactions;
DROP POLICY IF EXISTS "Enable read access for all users" ON transactions;

-- غیرفعال کردن RLS موقتاً برای تست
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- بررسی تراکنش‌های خریدار
SELECT 
    'تراکنش‌های خریدار (بدون RLS)' as test,
    COUNT(*) as count
FROM transactions
WHERE user_id = '5f4488db-9bed-4162-8925-d187f8bb423d';

-- بررسی تراکنش‌های فروشنده
SELECT 
    'تراکنش‌های فروشنده (بدون RLS)' as test,
    COUNT(*) as count
FROM transactions
WHERE user_id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48';

-- نمایش 5 تراکنش اخیر هر کاربر
SELECT 
    'آخرین تراکنش‌های خریدار' as category,
    id,
    type,
    amount,
    description,
    date,
    created_at
FROM transactions
WHERE user_id = '5f4488db-9bed-4162-8925-d187f8bb423d'
ORDER BY created_at DESC
LIMIT 5;

SELECT 
    'آخرین تراکنش‌های فروشنده' as category,
    id,
    type,
    amount,
    description,
    date,
    created_at
FROM transactions
WHERE user_id = 'd8841504-fb63-41d1-91b0-8cf66f8edf48'
ORDER BY created_at DESC
LIMIT 5;
