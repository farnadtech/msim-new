-- حل مشکل بدون استفاده از subquery

-- حذف تمام policies قدیمی
DROP POLICY IF EXISTS "users_view_own_transactions" ON transactions;
DROP POLICY IF EXISTS "admins_view_all_transactions" ON transactions;
DROP POLICY IF EXISTS "system_insert_transactions" ON transactions;
DROP POLICY IF EXISTS "admins_update_transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their own transactions" ON transactions;
DROP POLICY IF EXISTS "Users can view their transactions" ON transactions;
DROP POLICY IF EXISTS "Authenticated users can view transactions" ON transactions;
DROP POLICY IF EXISTS "System can insert transactions" ON transactions;
DROP POLICY IF EXISTS "Enable insert for authenticated users only" ON transactions;
DROP POLICY IF EXISTS "Enable read access for all users" ON transactions;
DROP POLICY IF EXISTS "Admins can view all transactions" ON transactions;
DROP POLICY IF EXISTS "Allow authenticated users to insert transactions" ON transactions;
DROP POLICY IF EXISTS "Admins can update transactions" ON transactions;
DROP POLICY IF EXISTS "System can create transactions" ON transactions;
DROP POLICY IF EXISTS "Allow service role to insert transactions" ON transactions;
DROP POLICY IF EXISTS "Allow all operations for authenticated users" ON transactions;

-- غیرفعال کردن RLS موقتاً
ALTER TABLE transactions DISABLE ROW LEVEL SECURITY;

-- نمایش وضعیت فعلی
SELECT 
    'RLS غیرفعال شد - همه کاربران می‌توانند همه تراکنش‌ها را ببینند' as status;

-- نمایش تعداد تراکنش‌ها
SELECT 
    'تعداد کل تراکنش‌ها' as info,
    COUNT(*) as count
FROM transactions;
